import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { UIPanel } from './surface';

export function UIPageShell({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('relative flex h-full min-w-0 flex-col overflow-hidden bg-transparent', className)}
      {...props}
    />
  );
}

interface UIPageHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  kicker?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}

export function UIPageHeader({
  kicker,
  title,
  description,
  actions,
  className,
  children,
  ...props
}: UIPageHeaderProps) {
  return (
    <div
      className={cn('border-b border-[var(--panel-border)] px-8 py-6', className)}
      {...props}
    >
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          {kicker && <div className="text-[11px] uppercase tracking-[0.24em] text-white/30">{kicker}</div>}
          <h2 className="mt-2 text-[30px] font-semibold tracking-tight text-white">{title}</h2>
          {description && (
            <p className="mt-2 max-w-4xl text-[15px] leading-7 text-white/48">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2.5">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

export function UIPageBody({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn('min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-8', className)}
      {...props}
    />
  );
}

export function UICardGrid({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('grid auto-rows-fr gap-4 md:grid-cols-2 2xl:grid-cols-3', className)}
      {...props}
    />
  );
}

export function UIListCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <UIPanel
      className={cn('flex h-full flex-col rounded-[1.7rem] border bg-[var(--panel-bg)]/72 px-5 py-5', className)}
      {...props}
    />
  );
}

export function UIOverlayPage({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'absolute inset-0 z-20 flex min-h-0 flex-col overflow-hidden bg-[linear-gradient(180deg,rgba(11,16,29,0.985),rgba(7,11,21,0.995))]',
        className,
      )}
      {...props}
    />
  );
}
