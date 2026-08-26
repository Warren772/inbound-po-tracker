/**
 * One labelled input.
 *
 * Not a client component itself, but used by the client component 
 * to render multiple forms.
 */
export function Field({
  label,
  name,
  defaultValue,
  type = 'text',
  required = false,
  placeholder,
  hint,
  min,
  step,
}: {
  label: string;
  name: string;
  defaultValue: string;
  type?: 'text' | 'date' | 'number';
  required?: boolean;
  placeholder?: string;
  /** The domain note under the input. */
  hint?: string;
  min?: string;
  step?: string;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-600">
        {label}
        {required ? null : <span className="ml-1 font-normal text-slate-400">optional</span>}
      </span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
        min={min}
        step={step}
        maxLength={type === 'text' ? 80 : undefined}
        className={`mt-1 block w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none ${
          type === 'text' ? '' : 'numeric'
        }`}
      />
      {hint ? <span className="mt-1 block text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}
