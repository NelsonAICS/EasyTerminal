import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { radiusClass } from '../../lib/shadcn-tokens';
import { UIBadge } from './surface';

export function WorkbenchShell({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'relative overflow-hidden border border-[var(--panel-border)] bg-[color:color-mix(in_srgb,var(--panel-bg)_94%,transparent)] shadow-[0_18px_40px_-28px_var(--shadow-color)]',
        radiusClass['2xl'],
        className,
      )}
      {...props}
    />
  );
}

export function WorkbenchFrame({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex min-h-0', className)} {...props} />;
}

export function WorkbenchSidebar({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <aside
      className={cn(
        'flex w-64 shrink-0 flex-col border-r border-[var(--panel-border)] bg-[color:color-mix(in_srgb,var(--bg-base)_92%,transparent)] p-4',
        className,
      )}
      {...props}
    />
  );
}

export function WorkbenchSidebarItem({
  active = false,
  leading,
  label,
  meta,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  leading?: ReactNode;
  label: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <button
      type="button"
      className={cn(
        'flex items-center gap-3 rounded-[1rem] border px-3 py-2.5 text-left transition-colors',
        active
          ? 'border-[var(--panel-border-glow)] bg-[var(--accent)]/12 text-[var(--text-primary)]'
          : 'border-transparent bg-transparent text-[var(--text-secondary)] hover:border-[var(--panel-border)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]',
        className,
      )}
      {...props}
    >
      {leading && <div className="shrink-0">{leading}</div>}
      <div className="min-w-0 flex-1 truncate text-sm font-medium">{label}</div>
      {meta && <div className="shrink-0 text-[11px] text-[var(--text-secondary)]">{meta}</div>}
    </button>
  );
}

export function WorkbenchMain({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex min-w-0 flex-1 flex-col', className)} {...props} />;
}

export function WorkbenchTopbar({
  title,
  subtitle,
  actions,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className={cn('border-b border-[var(--panel-border)] px-6 py-5', className)} {...props}>
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="text-xl font-semibold text-[var(--text-primary)]">{title}</div>
          {subtitle && <div className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{subtitle}</div>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function WorkbenchCommandBar({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-[1.5rem] border border-[var(--panel-border)] bg-white/[0.04] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]',
        'bg-[var(--surface-muted)] shadow-none',
        className,
      )}
      {...props}
    />
  );
}

export function WorkbenchStatGrid({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('grid gap-4 md:grid-cols-2 xl:grid-cols-4', className)} {...props} />;
}

export function WorkbenchStatCard({
  label,
  value,
  detail,
  tone = 'neutral',
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  label: ReactNode;
  value: ReactNode;
  detail?: ReactNode;
  tone?: 'neutral' | 'info' | 'success' | 'warning';
}) {
  const toneClass = tone === 'info'
    ? 'from-sky-400/14 to-transparent'
    : tone === 'success'
      ? 'from-emerald-400/14 to-transparent'
      : tone === 'warning'
        ? 'from-amber-400/14 to-transparent'
        : 'from-white/[0.05] to-transparent';

  return (
    <div
      className={cn(
        'rounded-[1.5rem] border border-[var(--panel-border)] bg-[var(--surface-muted)] p-4',
        `bg-gradient-to-br ${toneClass}`,
        className,
      )}
      {...props}
    >
      <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-secondary)]">{label}</div>
      <div className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">{value}</div>
      {detail && <div className="mt-2 text-sm text-[var(--text-secondary)]">{detail}</div>}
    </div>
  );
}

export function WorkbenchSection({
  title,
  description,
  actions,
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section
      className={cn(
        'rounded-[1.75rem] border border-[var(--panel-border)] bg-[var(--surface-muted)] p-5',
        className,
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-base font-semibold text-[var(--text-primary)]">{title}</div>
          {description && <div className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{description}</div>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function WorkbenchBoard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('grid gap-4 xl:grid-cols-3', className)} {...props} />;
}

export function WorkbenchBoardColumn({
  title,
  count,
  tone = 'neutral',
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  title: ReactNode;
  count?: ReactNode;
  tone?: 'neutral' | 'info' | 'success' | 'warning';
}) {
  const toneClass = tone === 'info'
    ? 'text-sky-100 bg-sky-500/10 border-sky-400/14'
    : tone === 'success'
      ? 'text-emerald-100 bg-emerald-500/10 border-emerald-400/14'
      : tone === 'warning'
        ? 'text-amber-100 bg-amber-500/10 border-amber-400/14'
        : 'text-[var(--text-primary)] bg-white/[0.04] border-[var(--panel-border)]';

  return (
    <div
      className={cn('rounded-[1.5rem] border border-[var(--panel-border)] bg-[color:color-mix(in_srgb,var(--bg-base)_78%,transparent)] p-4', className)}
      {...props}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-[var(--text-primary)]">{title}</div>
        {count !== undefined && <UIBadge className={cn('px-2.5 py-1 text-[10px]', toneClass)}>{count}</UIBadge>}
      </div>
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  );
}

export function WorkbenchTaskCard({
  title,
  description,
  meta,
  priority = 'normal',
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  priority?: 'normal' | 'high' | 'done';
}) {
  const priorityClass = priority === 'high'
    ? 'border-amber-400/14 bg-amber-500/8'
    : priority === 'done'
      ? 'border-emerald-400/14 bg-emerald-500/8'
      : 'border-[var(--panel-border)] bg-[var(--surface-muted)]';

  return (
    <div
      className={cn(
        'rounded-[1.25rem] border p-4 shadow-[0_16px_36px_-30px_rgba(0,0,0,0.8)]',
        priorityClass,
        className,
      )}
      {...props}
    >
      <div className="text-sm font-semibold text-[var(--text-primary)]">{title}</div>
      {description && <div className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{description}</div>}
      {meta && <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-[var(--text-secondary)]">{meta}</div>}
    </div>
  );
}
