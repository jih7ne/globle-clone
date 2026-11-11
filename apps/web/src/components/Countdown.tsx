import { useEffect, useRef, useState } from 'react';
import { en } from '../i18n/en';
import { formatCountdown, msUntilLocalMidnight } from '../lib/date';

/** FR-12: time left until the next country; calls `onMidnight` when it is reached. */
export function Countdown({ onMidnight }: { onMidnight: () => void }) {
  const [left, setLeft] = useState(() => msUntilLocalMidnight());
  const prev = useRef(left);

  useEffect(() => {
    const timer = setInterval(() => {
      const ms = msUntilLocalMidnight();
      // Past midnight, the remaining time jumps back up to about a day.
      if (ms > prev.current) onMidnight();
      prev.current = ms;
      setLeft(ms);
    }, 1000);
    return () => clearInterval(timer);
  }, [onMidnight]);

  return (
    <p className="flex items-baseline justify-between gap-3 px-4 py-3">
      <span className="caption text-muted">{en.nextCountry}</span>
      <time className="headline text-3xl tabular-nums">{formatCountdown(left)}</time>
    </p>
  );
}
