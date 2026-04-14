import type { ButtonHTMLAttributes, CSSProperties } from 'react';
import { cn } from '../../lib/cn';

type ButtonTone = 'primary' | 'neutral' | 'ghost' | 'success' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const toneStyles: Record<ButtonTone, string> = {
  primary: 'bg-blue-500/24 text-blue-50 hover:bg-blue-500/34 border-blue-400/18',
  neutral: 'bg-[var(--surface-muted)] text-white/88 hover:bg-white/[0.1] border-[var(--panel-border)]',
  ghost: 'bg-transparent text-white/76 hover:bg-[var(--surface-muted)] hover:text-white border-[var(--panel-border)]',
  success: 'bg-emerald-500/20 text-emerald-50 hover:bg-emerald-500/30 border-emerald-400/18',
  danger: 'bg-red-500/18 text-red-100 hover:bg-red-500/26 border-red-400/14',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 rounded-xl px-3 text-xs',
  md: 'h-10 rounded-2xl px-4 text-sm',
  lg: 'h-11 rounded-2xl px-5 text-sm',
  icon: 'h-9 w-9 rounded-xl p-0',
};

export interface UIButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: ButtonTone;
  size?: ButtonSize;
}

export function UIButton({
  className,
  tone = 'neutral',
  size = 'md',
  style,
  ...props
}: UIButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-1.5 border font-medium shadow-[0_8px_24px_rgba(0,0,0,0.16)] transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        toneStyles[tone],
        sizeStyles[size],
        className,
      )}
      style={{ WebkitAppRegion: 'no-drag', ...style } as CSSProperties}
      {...props}
    />
  );
}
