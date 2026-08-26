'use client';

import { useActionState } from 'react';

import { signIn, type SignInResult } from '@/app/actions';

/** No `defaultValue` on either input: echoing FormData back would render the password. */
const NO_ERROR: SignInResult = { error: null };

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(signIn, NO_ERROR);

  return (
    <form action={formAction} className="mt-6 space-y-3">
      <label className="block">
        <span className="block text-xs font-medium text-slate-600">Email</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="username"
          className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
        />
      </label>

      <label className="block">
        <span className="block text-xs font-medium text-slate-600">Password</span>
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
        />
      </label>

      <button
        type="submit"
        disabled={isPending}
        data-testid="sign-in"
        className="inline-flex w-full items-center justify-center rounded-md bg-slate-900 px-3 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {isPending ? 'Signing in…' : 'Sign in'}
      </button>

      {state.error ? (
        <p role="alert" data-testid="sign-in-error" className="text-xs text-rose-700">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
