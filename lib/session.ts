/** HS256 sessions. Imports nothing so the same verify runs in Node and the Edge sandbox. */

const ALG = 'HS256';

export const SESSION_COOKIE = 'po_session';

/** Eight hours: one shift. */
export const SESSION_TTL_SECONDS = 8 * 60 * 60;

export interface Session {
  sub: string;
  iat: number;
  exp: number;
}

/** Literal property access: the Edge sandbox throws on dynamic process.env reads. */
export function sessionSecret(): string {
  return process.env.AUTH_SECRET ?? 'demo-secret-do-not-ship-this';
}

function encodeText(value: string): Uint8Array<ArrayBuffer> {
  const bytes = new TextEncoder().encode(value);
  const copy = new Uint8Array(new ArrayBuffer(bytes.length));
  copy.set(bytes);
  return copy;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Uint8Array<ArrayBuffer>, not Uint8Array: TS 5.9 widens the latter past BufferSource. */
function base64UrlDecode(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', encodeText(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);
}

/** Mints a token for `sub`. The clock is a parameter so this module reads none. */
export async function signSession(
  sub: string,
  secret: string,
  nowSeconds: number,
): Promise<string> {
  const header = base64UrlEncode(encodeText(JSON.stringify({ alg: ALG, typ: 'JWT' })));
  const claims: Session = {
    sub,
    iat: nowSeconds,
    exp: nowSeconds + SESSION_TTL_SECONDS,
  };
  const payload = base64UrlEncode(encodeText(JSON.stringify(claims)));
  const signingInput = `${header}.${payload}`;

  const signature = await crypto.subtle.sign('HMAC', await hmacKey(secret), encodeText(signingInput));

  return `${signingInput}.${base64UrlEncode(new Uint8Array(signature))}`;
}

/** The session in `token`, or null for any bad shape, alg, signature, claim or expiry. */
export async function verifySession(
  token: string,
  secret: string,
  nowSeconds: number,
): Promise<Session | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, encodedSignature] = parts;

  let header: unknown;
  try {
    header = JSON.parse(new TextDecoder().decode(base64UrlDecode(encodedHeader)));
  } catch {
    return null;
  }
  if (
    typeof header !== 'object' ||
    header === null ||
    (header as { alg?: unknown }).alg !== ALG ||
    (header as { typ?: unknown }).typ !== 'JWT'
  ) {
    return null;
  }

  let verified: boolean;
  try {
    verified = await crypto.subtle.verify(
      'HMAC',
      await hmacKey(secret),
      base64UrlDecode(encodedSignature),
      encodeText(`${encodedHeader}.${encodedPayload}`),
    );
  } catch {
    return null;
  }
  if (!verified) return null;

  let claims: unknown;
  try {
    claims = JSON.parse(new TextDecoder().decode(base64UrlDecode(encodedPayload)));
  } catch {
    return null;
  }
  if (typeof claims !== 'object' || claims === null) return null;

  const { sub, iat, exp } = claims as { sub?: unknown; iat?: unknown; exp?: unknown };
  if (typeof sub !== 'string' || typeof iat !== 'number' || typeof exp !== 'number') return null;
  if (nowSeconds >= exp) return null;

  return { sub, iat, exp };
}
