import type { HTMLAttributes, ThHTMLAttributes, TdHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';

// ─── UITable ─────────────────────────────────────────────────────────

interface UITableProps extends HTMLAttributes<HTMLTableElement> {
  /** 表格变体 */
  variant?: 'default' | 'bordered' | 'plain';
  /** 紧凑模式 */
  size?: 'sm' | 'md' | 'lg';
}

export function UITable({
  className,
  variant = 'default',
  size = 'md',
  ...props
}: UITableProps) {
  const variantStyles = {
    default: 'divide-y divide-[var(--panel-border)]',
    bordered: 'border border-[var(--panel-border)]',
    plain: '',
  };

  const sizeStyles = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <table
      className={cn('w-full caption-bottom', variantStyles[variant], sizeStyles[size], className)}
      {...props}
    />
  );
}

export function UITableHeader({
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={cn('bg-[var(--surface-muted)] text-[var(--text-secondary)]', className)} {...props} />
  );
}

export function UITableBody({
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={cn('divide-y divide-[var(--panel-border)]', className)} {...props} />
  );
}

export function UITableRow({
  className,
  ...props
}: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={cn('transition-colors hover:bg-[var(--surface-muted)]', className)} {...props} />
  );
}

export function UITableHead({
  className,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={cn('h-12 px-4 text-left align-middle font-medium text-[var(--text-secondary)]', className)} {...props} />
  );
}

export function UITableCell({
  className,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn('p-4 align-middle text-[var(--text-primary)]', className)} {...props} />
  );
}

interface UITableEmptyProps {
  message?: string;
  children?: ReactNode;
}

export function UITableEmpty({ message = '暂无数据', children }: UITableEmptyProps) {
  return (
    <tr>
      <td colSpan={100} className="py-12 text-center text-[var(--text-secondary)]">
        {children || message}
      </td>
    </tr>
  );
}

// ─── UIList ─────────────────────────────────────────────────────────

interface UIListProps {
  /** 自定义 className */
  className?: string;
  /** 子元素 */
  children: ReactNode;
}

export function UIList({ className, children }: UIListProps) {
  return <div className={cn('flex flex-col', className)}>{children}</div>;
}

interface UIListItemProps extends HTMLAttributes<HTMLDivElement> {
  /** 左侧图标 */
  leading?: ReactNode;
  /** 右侧额外内容 */
  trailing?: ReactNode;
  /** 选中状态 */
  selected?: boolean;
  /** 点击回调 */
  onClick?: () => void;
  /** 是否禁用 */
  disabled?: boolean;
}

export function UIListItem({
  className,
  leading,
  trailing,
  selected = false,
  onClick,
  disabled = false,
  children,
  ...props
}: UIListItemProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 transition-colors rounded-xl cursor-pointer',
        selected && 'bg-[var(--accent)]/10 border border-[var(--accent)]/30',
        !selected && !disabled && 'hover:bg-[var(--surface-muted)]',
        disabled && 'opacity-50 cursor-not-allowed',
        className,
      )}
      onClick={disabled ? undefined : onClick}
      {...props}
    >
      {leading && <span className="flex-shrink-0">{leading}</span>}
      <span className="flex-1 min-w-0 text-[var(--text-primary)]">{children}</span>
      {trailing && <span className="flex-shrink-0 text-[var(--text-secondary)]">{trailing}</span>}
    </div>
  );
}

interface UIListGroupProps {
  /** 分组标题 */
  title?: string;
  /** 分组描述 */
  description?: string;
  children: ReactNode;
}

export function UIListGroup({ title, description, children }: UIListGroupProps) {
  return (
    <div className="mb-4">
      {(title || description) && (
        <div className="px-4 py-2">
          {title && (
            <div className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">{title}</div>
          )}
          {description && (
            <div className="mt-1 text-xs text-[var(--text-secondary)]/70">{description}</div>
          )}
        </div>
      )}
      <div className="space-y-1">{children}</div>
    </div>
  );
}

interface UIListEmptyProps {
  message?: string;
  children?: ReactNode;
}

export function UIListEmpty({ message = '暂无内容', children }: UIListEmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-[var(--text-secondary)]">
      {children || message}
    </div>
  );
}