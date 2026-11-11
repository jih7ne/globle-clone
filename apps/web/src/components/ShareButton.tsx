import { useEffect, useState } from 'react';
import { useT } from '../i18n/context';

type State = 'idle' | 'copied' | 'failed';

/**
 * FR-17: the native share sheet on touch devices, the clipboard elsewhere (section 5).
 */
export function ShareButton({ text }: { text: string }) {
  const { t: en } = useT();
  const [state, setState] = useState<State>('idle');

  useEffect(() => {
    if (state === 'idle') return;
    const timer = setTimeout(() => setState('idle'), 2500);
    return () => clearTimeout(timer);
  }, [state]);

  const share = async () => {
    const touch = window.matchMedia?.('(pointer: coarse)').matches ?? false;
    if (touch && typeof navigator.share === 'function') {
      try {
        await navigator.share({ text });
        return;
      } catch (err) {
        // The player closed the sheet: nothing to do. Other errors fall back to copying.
        if (err instanceof DOMException && err.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setState('copied');
    } catch {
      setState('failed');
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => void share()}
        className="headline w-full bg-ink px-4 py-4 text-left text-3xl text-paper transition-colors hover:bg-burning"
      >
        {state === 'copied' ? en.shareCopied : en.share} {state === 'copied' ? '✓' : '→'}
      </button>
      <p aria-live="polite" className="sr-only">
        {state === 'copied' ? en.shareCopied : ''}
      </p>
      {state === 'failed' && (
        <pre className="caption border-t-2 border-ink p-3 whitespace-pre-wrap normal-case">
          {en.shareFailed}
          {'\n\n'}
          {text}
        </pre>
      )}
    </div>
  );
}
