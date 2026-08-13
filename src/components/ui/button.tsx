import type { ButtonHTMLAttributes, CSSProperties } from 'react';
import { cn } from '../../lib/cn';
import { radiusClass, shadows } from '../../lib/shadcn-tokens';

type ButtonTone = 'primary' | 'neutral' | 'ghost' | 'success' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const toneStyles: Record<ButtonTone, string> = {
  primary: 'bg-blue-500/24 text-blue-50 hover:bg-blue-500/34 border-blue-400/18',
  neutral: 'bg-[color:color-mix(in_srgb,var(--surface-strong)_82%,transparent)] text-[var(--text-primary)] hover:bg-[color:color-mix(in_srgb,var(--surface-strong)_94%,transparent)] border-[var(--panel-border)]',
  ghost: 'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] border-[var(--panel-border)]',
  success: 'bg-emerald-500/20 text-emerald-50 hover:bg-emerald-500/30 border-emerald-400/18',
  danger: 'bg-red-500/18 text-red-100 hover:bg-red-500/26 border-red-400/14',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: `h-8 px-3 text-xs ${radiusClass.subtle}`,
  md: `h-10 px-4 text-sm ${radiusClass.lg}`,
  lg: `h-11 px-5 text-sm ${radiusClass.lg}`,
  icon: `h-9 w-9 p-0 ${radiusClass.subtle}`,
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
        'inline-flex items-center justify-center gap-1.5 border font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        shadows.button,
        toneStyles[tone],
        sizeStyles[size],
        className,
      )}
      style={{ WebkitAppRegion: 'no-drag', ...style } as CSSProperties}
      {...props}
    />
  );
}
