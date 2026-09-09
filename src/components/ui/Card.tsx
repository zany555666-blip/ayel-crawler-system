import { cn } from "@/lib/utils";
import { ReactNode } from "react";

export function Card({ children, className }: CardProps) {
  return (
    <div
      className={cn(
        "bg-[var(--surface)] rounded-2xl border border-[var(--border)]",
        className
      )}
    >
      {children}
    </div>
  );
}

interface CardProps {
  children: ReactNode;
  className?: string;
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center font-medium rounded-full transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97]";

  const variants: Record<string, string> = {
    primary:
      "bg-[var(--fg)] text-[var(--bg)] hover:bg-[var(--surface3)]",
    secondary:
      "bg-[var(--surface2)] text-[var(--fg)] hover:bg-[var(--surface3)] border border-[var(--border)]",
    danger:
      "bg-[var(--err)] text-white hover:bg-[#ff5c52]",
    ghost:
      "text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--surface2)]",
  };

  const sizes: Record<string, string> = {
    sm: "h-8 px-4 text-xs gap-1.5",
    md: "h-10 px-5 text-sm gap-2",
    lg: "h-12 px-7 text-base gap-2",
  };

  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, ...props }: InputProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-[13px] font-medium text-[var(--fg)]">{label}</label>
      )}
      <input
        className={cn(
          "w-full h-11 px-4 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-sm text-[var(--fg)]",
          "placeholder:text-[var(--sub)]",
          "focus:outline-none focus:border-[var(--sub)] focus:bg-[var(--surface3)]",
          "transition-all duration-200",
          error && "border-[#ff453a]",
          className
        )}
        {...props}
      />
      {error && (
        <p className="text-xs text-[var(--err)] font-medium ml-1">{error}</p>
      )}
    </div>
  );
}

interface BadgeProps {
  variant?: "default" | "success" | "warning" | "danger" | "info";
  children: ReactNode;
  className?: string;
}

export function Badge({ variant = "default", children, className }: BadgeProps) {
  const variants: Record<string, string> = {
    default: "bg-[var(--surface2)] text-[var(--muted)] border border-[var(--border)]",
    success: "bg-[var(--okbg)] text-[var(--ok)]",
    warning: "bg-[var(--warnbg)] text-[var(--warn)]",
    danger: "bg-[var(--errbg)] text-[var(--err)]",
    info: "bg-[var(--infobg)] text-[var(--info)]",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn("animate-spin h-4 w-4 text-[var(--fg)]", className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
