import type { CSSProperties, ReactNode } from 'react';
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
  const noDragStyle = { WebkitAppRegion: 'no-drag' } as CSSProperties;
  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-[color:color-mix(in_srgb,var(--bg-base)_78%,transparent)] p-6 backdrop-blur-xl"
      style={noDragStyle}
      role="presentation"
      onClick={(event) => {
        // Only the backdrop itself closes the modal. This is deliberately
        // target-based as a second guard in addition to the inner stopPropagation
        // so a child panel can never accidentally dismiss its parent window.
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div
        className={cn(
          'relative flex h-[88vh] w-full max-w-[1480px] flex-col overflow-hidden',
          `shell-panel border border-[var(--panel-border)] ${radiusClass['2xl']} ${shadows.modal}`,
          className,
        )}
        style={noDragStyle}
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
