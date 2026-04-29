import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export function Input({ className = "", error, ...props }: InputProps) {
  return (
    <input
      className={`w-full bg-surface-raised/50 border ${
        error
          ? "border-ghost/40 focus:border-ghost"
          : "border-surface-hover focus:border-accent-light"
      } px-4 py-3 text-base text-text-primary outline-none transition-all duration-200 placeholder:text-text-faint focus:bg-surface-raised rounded-lg ${className}`}
      {...props}
    />
  );
}
