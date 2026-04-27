import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export function Input({ className = "", error, ...props }: InputProps) {
  return (
    <input
      className={`w-full bg-surface-raised/50 border ${
        error
          ? "border-red-500/50 focus:border-red-500"
          : "border-surface-hover focus:border-accent-light"
      } px-4 py-2.5 text-sm text-text-primary outline-none transition-all duration-200 placeholder:text-text-faint uppercase tracking-widest focus:bg-surface-raised rounded-sm ${className}`}
      {...props}
    />
  );
}
