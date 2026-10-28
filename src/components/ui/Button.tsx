import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "outline" | "danger" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANT: Record<ButtonVariant, string> = {
  primary: "border-2 border-accent bg-accent text-white hover:border-accent-hover hover:bg-accent-hover",
  secondary: "border border-line-strong bg-card text-fg-1 hover:bg-sunken",
  outline: "border-2 border-current bg-transparent text-fg-1 hover:bg-sunken",
  danger: "border-2 border-danger bg-transparent text-danger-fg hover:bg-danger-soft",
  ghost: "border border-transparent bg-transparent text-fg-1 hover:bg-sunken",
};

const SIZE: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 text-sm",
  md: "min-h-11 px-4 text-sm",
  lg: "min-h-12 px-4 py-2 text-base",
};

/** Marka düğmesinin sınıfları (Link veya başka öğeler için de). Ekranda en fazla bir primary. */
export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", block = false) {
  return `inline-flex items-center justify-center gap-2 rounded-md font-semibold no-underline transition-colors duration-[var(--dur-fast)] active:translate-y-px disabled:pointer-events-none disabled:opacity-50 ${VARIANT[variant]} ${SIZE[size]} ${block ? "w-full" : ""}`;
}

type Common = { variant?: ButtonVariant; size?: ButtonSize; block?: boolean; className?: string; children?: ReactNode };

export function Button({ variant, size, block, className, type = "button", ...rest }: Common & ComponentProps<"button">) {
  return <button type={type} className={`${buttonClass(variant, size, block)} ${className ?? ""}`} {...rest} />;
}

export function ButtonLink({ variant, size, block, className, ...rest }: Common & ComponentProps<typeof Link>) {
  return <Link className={`${buttonClass(variant, size, block)} ${className ?? ""}`} {...rest} />;
}
