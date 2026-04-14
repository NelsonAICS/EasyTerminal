import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

export const UIInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function UIInput({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          'h-10 w-full rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-muted)] px-4 text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] outline-none transition-colors placeholder:text-white/30 focus:border-[var(--panel-border-glow)] focus:bg-white/[0.09]',
          className,
        )}
        {...props}
      />
    );
  },
);

export const UITextarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function UITextarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          'w-full rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-muted)] px-4 py-3 text-sm leading-6 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] outline-none transition-colors placeholder:text-white/30 focus:border-[var(--panel-border-glow)] focus:bg-white/[0.09]',
          className,
        )}
        {...props}
      />
    );
  },
);
