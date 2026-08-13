import {
  forwardRef,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from '../../lib/cn';
import { radiusClass, shadows } from '../../lib/shadcn-tokens';

export const UIInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function UIInput({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          'ui-field h-10 w-full border px-4 text-sm outline-none',
          `border-[var(--panel-border)] ${radiusClass.lg} ${shadows.inset}`,
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
          'ui-field w-full border px-4 py-3 text-sm leading-6 outline-none',
          `border-[var(--panel-border)] ${radiusClass.lg} ${shadows.inset}`,
          className,
        )}
        {...props}
      />
    );
  },
);

export const UISelect = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function UISelect({ className, children, ...props }, ref) {
    return (
      <select
        ref={ref}
        className={cn(
          'ui-field h-10 w-full border px-4 text-sm outline-none',
          `border-[var(--panel-border)] ${radiusClass.lg} ${shadows.inset}`,
          className,
        )}
        {...props}
      >
        {children}
      </select>
    );
  },
);
