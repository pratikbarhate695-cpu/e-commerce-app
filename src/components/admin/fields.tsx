import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string };

export function AdminField({ label, id, ...props }: FieldProps) {
  const fieldId = id ?? props.name;
  return (
    <label htmlFor={fieldId} className="block">
      <span className="text-sm text-ink/60">{label}</span>
      <input
        id={fieldId}
        {...props}
        className="mt-1 w-full border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-accent"
      />
    </label>
  );
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string };

export function AdminTextarea({ label, id, ...props }: TextareaProps) {
  const fieldId = id ?? props.name;
  return (
    <label htmlFor={fieldId} className="block">
      <span className="text-sm text-ink/60">{label}</span>
      <textarea
        id={fieldId}
        {...props}
        className="mt-1 w-full border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-accent"
      />
    </label>
  );
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  children: React.ReactNode;
};

export function AdminSelect({ label, id, children, ...props }: SelectProps) {
  const fieldId = id ?? props.name;
  return (
    <label htmlFor={fieldId} className="block">
      <span className="text-sm text-ink/60">{label}</span>
      <select
        id={fieldId}
        {...props}
        className="mt-1 w-full border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-accent"
      >
        {children}
      </select>
    </label>
  );
}

export function AdminCheckbox({
  label,
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const fieldId = id ?? props.name;
  return (
    <label htmlFor={fieldId} className="flex items-center gap-2 text-sm text-ink/80">
      <input id={fieldId} type="checkbox" {...props} className="accent-accent" />
      {label}
    </label>
  );
}
