import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { zIndex } from '../../lib/shadcn-tokens';

interface UIDrawerProps {
  open: boolean;
  children: ReactNode;
  className?: string;
  /** 抽屉位置 */
  position?: 'left' | 'right' | 'top' | 'bottom';
  /** 抽屉宽度/高度 */
  size?: string;
  /** 是否显示遮罩 */
  backdrop?: boolean;
  onClose?: () => void;
}

export function UIDrawer({
  open,
  children,
  className,
  position = 'right',
  size = '320px',
  backdrop = true,
  onClose,
}: UIDrawerProps) {
  if (!open) return null;

  const positionClasses: Record<string, string> = {
    left: 'left-0 top-0 h-full border-r',
    right: 'right-0 top-0 h-full border-l',
    top: 'left-0 top-0 w-full border-b',
    bottom: 'left-0 bottom-0 w-full border-t',
  };

  const sizeClasses: Record<string, string> = {
    left: `max-w-[${size}]`,
    right: `max-w-[${size}]`,
    top: `max-h-[${size}]`,
    bottom: `max-h-[${size}]`,
  };

  return (
    <>
      {backdrop && (
        <div
          className={`fixed inset-0 z-[${zIndex.modalBackdrop}] bg-black/48 backdrop-blur-sm`}
          onClick={onClose}
        />
      )}
      <div
        className={cn(
          'fixed z-[120] flex flex-col bg-[var(--panel-bg)] border-[var(--panel-border)]',
          positionClasses[position],
          sizeClasses[position],
          className,
        )}
      >
        {children}
      </div>
    </>
  );
}

interface UIDrawerHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function UIDrawerHeader({
  title,
  description,
  actions,
  className,
}: UIDrawerHeaderProps) {
  return (
    <div className={cn('flex flex-col border-b border-[var(--panel-border)] px-5 py-5', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {description && (
        <p className="mt-1 text-sm text-[var(--text-secondary)]">{description}</p>
      )}
    </div>
  );
}

export function UIDrawerBody({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex-1 overflow-y-auto px-5 py-5', className)} {...props}>
      {children}
    </div>
  );
}

export function UIDrawerFooter({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex items-center justify-end gap-3 border-t border-[var(--panel-border)] px-5 py-4', className)} {...props}>
      {children}
    </div>
  );
}