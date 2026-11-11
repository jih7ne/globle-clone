import { useEffect, useRef, type ReactNode } from 'react';
import { en } from '../i18n/en';

/** A sheet that slides in from the right (Stats, About: section 3). Escape closes it. */
export function SidePanel({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      previous?.focus({ preventScroll: true });
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button
        type="button"
        aria-label={en.close}
        tabIndex={-1}
        className="absolute inset-0 bg-ink/50"
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="panel-in relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l-2 border-ink bg-paper"
      >
        <header className="flex items-start justify-between gap-4 border-b-2 border-ink p-5">
          <h2 className="headline text-6xl">{title}.</h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="caption shrink-0 border-2 border-ink px-2 py-1 hover:bg-ink hover:text-paper"
          >
            {en.close} · Esc
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
