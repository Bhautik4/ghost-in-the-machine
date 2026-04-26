import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export function Input({ className = "", error, ...props }: InputProps) {
  return (
    <input
      className={`w-full bg-[#1e1e22]/50 border ${
        error ? "border-red-500/50 focus:border-red-500" : "border-[#3f3f46] focus:border-[#8b5cf6]"
      } px-4 py-2.5 text-sm text-[#e4e4e7] outline-none transition-all duration-200 placeholder:text-[#52525b] uppercase tracking-widest focus:bg-[#1e1e22] focus:shadow-[0_0_10px_rgba(139,92,246,0.1)] rounded-sm ${className}`}
      {...props}
    />
  );
}
