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
      "bg-accent/10 text-accent-soft border border-accent/50 hover:bg-accent/20 hover:border-accent-light hover:shadow-accent-strong",
    secondary:
      "bg-border/50 text-text-secondary border border-surface-hover hover:bg-surface-hover/80 hover:text-text-primary hover:border-text-faint",
    danger:
      "bg-red-950/30 text-red-400 border border-red-900/50 hover:bg-red-900/40 hover:border-red-500/50 hover:shadow-ghost",
    ghost:
      "bg-transparent text-text-muted hover:text-text-primary hover:bg-border/30",
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
