import { ButtonHTMLAttributes } from "react";

export function Button({
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`w-full rounded-xl bg-accent py-3 text-sm font-semibold text-on-accent shadow-sm transition hover:shadow-lg hover:shadow-accent/30 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    />
  );
}
