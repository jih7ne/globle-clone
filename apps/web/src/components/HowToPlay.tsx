import { useEffect, useRef } from 'react';
import { BANDS } from '@gw/shared';
import { en } from '../i18n/en';

/** FR-15: shown on the first visit, reopenable from the header. */
export function HowToPlay({ onClose }: { onClose: () => void }) {
  const startRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Keep the sheet scrolled to the top on small screens.
    startRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-3 sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="how-to-title"
        className="slide-in flex max-h-full w-full max-w-3xl flex-col overflow-y-auto border-2 border-ink bg-paper"
      >
        <div className="flex items-start justify-between gap-4 border-b-2 border-ink p-5 sm:p-6">
          <h2 id="how-to-title" className="headline text-6xl sm:text-7xl">
            {en.howToPlay}.
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="caption shrink-0 border-2 border-ink px-2 py-1 hover:bg-ink hover:text-paper"
          >
            {en.close} · Esc
          </button>
        </div>

        <ol className="grid sm:grid-cols-3">
          {en.howToSteps.map((step, i) => (
            <li
              key={step.title}
              className="grid grid-cols-[3rem_1fr] gap-x-3 gap-y-1 border-b-2 border-ink p-4 sm:flex sm:flex-col sm:gap-2 sm:border-b-0 sm:p-6 sm:not-first:border-l-2"
            >
              <span className="headline row-span-2 text-4xl text-burning sm:text-5xl">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="text-lg font-extrabold uppercase">{step.title}</h3>
              <p className="text-[15px] leading-snug">{step.body}</p>
            </li>
          ))}
        </ol>

        <section className="border-ink p-4 sm:border-t-2 sm:p-6" aria-labelledby="scale-title">
          <h3 id="scale-title" className="caption mb-3 text-muted">
            {en.bandsHeading}
          </h3>
          {/* Stacked rows on phones, five columns from the sm breakpoint. */}
          <ul className="grid border-2 border-ink sm:grid-cols-5">
            {[...BANDS].reverse().map((b) => (
              <li
                key={b.band}
                className="flex border-ink not-first:border-t-2 sm:block sm:not-first:border-t-0 sm:not-first:border-l-2"
              >
                <div className="w-12 shrink-0 sm:h-10 sm:w-auto" style={{ background: b.color }} />
                <div className="flex flex-1 items-baseline justify-between gap-2 border-l-2 border-ink px-3 py-1.5 sm:block sm:border-t-2 sm:border-l-0 sm:p-2">
                  <p className="text-sm font-extrabold uppercase">{en.bands[b.band]}</p>
                  <p className="caption text-[10px] text-muted">{en.bandRanges[b.band]}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <button
          ref={startRef}
          type="button"
          onClick={onClose}
          className="headline border-t-2 border-ink bg-ink p-5 text-left text-4xl text-paper transition-colors hover:bg-burning sm:p-6"
        >
          {en.start} →
        </button>
      </div>
    </div>
  );
}
