import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface UIModalProps {
  open: boolean;
  children: ReactNode;
  className?: string;
}

export function UIModal({ open, children, className }: UIModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/72 p-6 backdrop-blur-lg">
      <div
        className={cn(
          'relative flex h-[88vh] w-full max-w-[1480px] flex-col overflow-hidden rounded-[2rem] border border-[var(--panel-border)] bg-[linear-gradient(180deg,rgba(10,14,25,0.98),rgba(8,12,22,0.99))] shadow-[0_40px_120px_rgba(0,0,0,0.55)]',
          className,
        )}
        style={{ WebkitAppRegion: 'no-drag' } as any}
      >
        {children}
      </div>
    </div>
  );
}
