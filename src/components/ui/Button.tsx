import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}

export function Button({
  className = "",
  variant = "primary",
  size = "md",
  fullWidth = false,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center font-medium transition-all duration-200 outline-none disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest cursor-pointer";

  const variants = {
    primary:
      "bg-[#6d28d9]/10 text-[#a78bfa] border border-[#6d28d9]/50 hover:bg-[#6d28d9]/20 hover:border-[#8b5cf6] hover:shadow-[0_0_15px_rgba(109,40,217,0.4)]",
    secondary:
      "bg-[#27272a]/50 text-[#d4d4d8] border border-[#3f3f46] hover:bg-[#3f3f46]/80 hover:text-[#f4f4f5] hover:border-[#52525b]",
    danger:
      "bg-red-950/30 text-red-400 border border-red-900/50 hover:bg-red-900/40 hover:border-red-500/50 hover:shadow-[0_0_15px_rgba(220,38,38,0.3)]",
    ghost:
      "bg-transparent text-[#a1a1aa] hover:text-[#e4e4e7] hover:bg-[#27272a]/30",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-5 py-2.5 text-sm",
    lg: "px-6 py-3.5 text-base",
  };

  const widthStyle = fullWidth ? "w-full" : "";

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${widthStyle} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
