import { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export function Field({ label, id, ...props }: Props) {
  const fieldId = id ?? props.name;
  return (
    <label htmlFor={fieldId} className="block">
      <span className="text-sm text-ink/70">{label}</span>
      <input
        id={fieldId}
        {...props}
        className="mt-1 w-full border-0 border-b border-ink/25 bg-transparent py-2 text-base text-ink outline-none transition-colors focus:border-accent"
      />
    </label>
  );
}
