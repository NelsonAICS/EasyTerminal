import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { radiusClass, shadows } from '../../lib/shadcn-tokens';

interface UIModalProps {
  open: boolean;
  children: ReactNode;
  className?: string;
  onClose?: () => void;
}

export function UIModal({ open, children, className, onClose }: UIModalProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-[color:color-mix(in_srgb,var(--bg-base)_78%,transparent)] p-6 backdrop-blur-xl"
      style={{ WebkitAppRegion: 'no-drag' } as any}
      onClick={() => onClose?.()}
    >
      <div
        className={cn(
          'relative flex h-[88vh] w-full max-w-[1480px] flex-col overflow-hidden',
          `shell-panel border border-[var(--panel-border)] ${radiusClass['2xl']} ${shadows.modal}`,
          className,
        )}
        style={{ WebkitAppRegion: 'no-drag' } as any}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
