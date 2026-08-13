import type { ButtonHTMLAttributes, HTMLAttributes, LabelHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { radiusClass } from '../../lib/shadcn-tokens';
import { UIButton } from './button';
import { UIPanel } from './surface';

export function UIMasterDetailShell({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex h-full min-h-0', className)} {...props} />;
}

export function UIMasterDetailSidebar({
  className,
  widthClass = 'w-[21rem]',
  ...props
}: HTMLAttributes<HTMLDivElement> & { widthClass?: string }) {
  return (
    <div
      className={cn(
        'flex shrink-0 flex-col border-r border-[var(--panel-border)] bg-[var(--ui-sidebar-bg)]',
        widthClass,
        className,
      )}
      {...props}
    />
  );
}

export function UIMasterDetailContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex min-w-0 flex-1 flex-col overflow-hidden', className)} {...props} />;
}

export function UIPaneHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('border-b border-[var(--panel-border)] bg-[var(--ui-pane-header-bg)] px-5 py-4 sm:px-6', className)}
      {...props}
    />
  );
}

export function UIPaneBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5', className)} {...props} />;
}

export function UIPaneFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('border-t border-[var(--panel-border)] bg-[var(--ui-pane-footer-bg)] px-4 py-4 sm:px-5', className)}
      {...props}
    />
  );
}

interface UICatalogItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  heading: ReactNode;
  description?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  meta?: ReactNode;
  selected?: boolean;
  disabled?: boolean;
}

export function UICatalogItem({
  heading,
  description,
  leading,
  trailing,
  meta,
  selected = false,
  disabled = false,
  className,
  ...props
}: UICatalogItemProps) {
  return (
    <button
      type="button"
      className={cn(
        'group flex w-full items-start gap-3 border px-4 py-3 text-left transition-all',
        radiusClass.lg,
        selected
          ? 'border-[var(--panel-border-glow)] bg-[var(--ui-card-selected-bg)] shadow-[var(--ui-card-shadow)]'
          : 'border-transparent bg-transparent hover:border-[var(--panel-border)] hover:bg-[var(--ui-card-hover-bg)]',
        disabled && 'opacity-45',
        className,
      )}
      {...props}
    >
      {leading && <div className="mt-0.5 shrink-0">{leading}</div>}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--text-primary)]">{heading}</div>
            {trailing && <div className="shrink-0">{trailing}</div>}
          </div>
        {description && (
          <div className="mt-1 line-clamp-2 text-[11px] leading-5 text-[var(--text-secondary)]">{description}</div>
        )}
        {meta && <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-[var(--text-secondary)]">{meta}</div>}
      </div>
    </button>
  );
}

export function UIEmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex h-full min-h-[16rem] flex-col items-center justify-center gap-3 px-6 text-center',
        className,
      )}
    >
      {icon && (
        <div className="flex h-14 w-14 items-center justify-center rounded-[1.25rem] border border-[var(--panel-border)] bg-[var(--ui-card-bg)] text-[var(--text-secondary)]">
          {icon}
        </div>
      )}
      <div className="text-base font-semibold text-[var(--text-primary)]">{title}</div>
      {description && <div className="max-w-md text-sm leading-6 text-[var(--text-secondary)]">{description}</div>}
      {action}
    </div>
  );
}

export function UIFieldLabel({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn('mb-2 block text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--text-secondary)]', className)}
      {...props}
    />
  );
}

export function UIInfoCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <UIPanel
      className={cn('border bg-[var(--ui-info-bg)] p-4 shadow-none', className)}
      {...props}
    />
  );
}

export function UIInlineAction({
  className,
  tone = 'ghost',
  size = 'sm',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: 'ghost' | 'neutral' | 'primary' | 'success' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}) {
  return <UIButton tone={tone} size={size} className={cn('shrink-0', className)} {...props} />;
}
