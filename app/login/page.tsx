import { LoginForm } from './login-form';

/** Sign-in. Reading the book needs no account but changing it does. */
export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center">
      <h1 className="page-title">Inbound PO Tracker</h1>
      <p className="mt-1 text-sm text-slate-600">
        Sign in to see which purchase orders are in flight.
      </p>
      <LoginForm />
      <p className="mt-6 border-t border-slate-200 pt-4 text-xs text-slate-500">
        Demo account: <span className="font-medium text-slate-700">ops@savannah.example</span> /{' '}
        <span className="font-medium text-slate-700">inbound</span>. There is no user store behind
        this, so it is the only account there is.
      </p>
    </div>
  );
}
