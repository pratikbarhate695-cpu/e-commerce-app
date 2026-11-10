import { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export function Field({ label, id, ...props }: Props) {
  const fieldId = id ?? props.name;
  return (
    <label htmlFor={fieldId} className="block">
      <span className="text-sm font-medium text-ink/75">{label}</span>
      <input
        id={fieldId}
        {...props}
        className="mt-1.5 w-full rounded-xl border border-ink/50 bg-surface px-3.5 py-2.5 text-base text-ink transition-colors placeholder:text-ink/65 focus:border-accent"
      />
    </label>
  );
}
