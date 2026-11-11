import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import type { FeedbackRequest } from '@gw/shared';
import { useT } from '../i18n/context';
import { ApiError, api } from '../lib/api';

type Device = FeedbackRequest['device'];
type Again = NonNullable<FeedbackRequest['again']>;

/** Coldest to hottest, like the game's heat gauge: 1 = Freezing, 5 = Burning. */
const SCALE = [
  { band: 'freezing', color: 'var(--color-freezing)' },
  { band: 'cool', color: 'var(--color-cool)' },
  { band: 'warm', color: 'var(--color-warm)' },
  { band: 'hot', color: 'var(--color-hot)' },
  { band: 'burning', color: 'var(--color-burning)' },
] as const;

const FIELD = 'w-full border-2 border-ink bg-white p-3 text-base outline-none focus:border-hot';

/** One numbered question, in the game's editorial style. */
function Question({
  n,
  title,
  hint,
  required,
  children,
}: {
  n: number;
  title: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  const { t } = useT();
  return (
    <fieldset className="border-t-2 border-ink pt-4">
      <legend className="w-full">
        <span className="caption flex justify-between text-muted">
          <span>{String(n).padStart(2, '0')}</span>
          <span className={required ? 'font-semibold text-ink' : ''}>
            {required ? t.feedback.required : t.feedback.optional}
          </span>
        </span>
        <span className="mt-2 block text-xl leading-tight font-extrabold uppercase">{title}</span>
      </legend>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
      <div className="mt-3">{children}</div>
    </fieldset>
  );
}

/** Square segmented choice: real radio buttons, styled like the game's nav. */
function Choice<T extends string>({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: Record<T, string>;
  value: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <div className="caption flex border-2 border-ink text-xs">
      {(Object.keys(options) as T[]).map((key) => (
        <label
          key={key}
          className="flex-1 cursor-pointer px-2 py-3 text-center not-first:border-l-2 not-first:border-ink hover:bg-ink/10 has-checked:bg-ink has-checked:text-paper has-focus-visible:outline-3 has-focus-visible:outline-hot"
        >
          <input
            type="radio"
            name={name}
            value={key}
            checked={value === key}
            onChange={() => onChange(key)}
            className="sr-only"
          />
          {options[key]}
        </label>
      ))}
    </div>
  );
}

export function FeedbackForm() {
  const { t, lang, setLang } = useT();
  const f = t.feedback;
  const [device, setDevice] = useState<Device | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [again, setAgain] = useState<Again | null>(null);
  const [problems, setProblems] = useState('');
  const [ideas, setIdeas] = useState('');
  const [setup, setSetup] = useState('');
  const [website, setWebsite] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);
  const thanks = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    document.title = `${f.pageTitle} · ${t.title}`;
  }, [f.pageTitle, t.title]);

  useEffect(() => {
    if (status === 'sent') thanks.current?.focus();
  }, [status]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!device || !rating) {
      setError(f.missing);
      return;
    }
    setError(null);
    setStatus('sending');
    try {
      await api.feedback({
        device,
        rating,
        ...(again ? { again } : {}),
        problems,
        ideas,
        setup,
        lang,
        website,
      });
      setStatus('sent');
    } catch (err) {
      setStatus('idle');
      setError(err instanceof ApiError && err.code === 'rate_limited' ? f.tooMany : f.failed);
    }
  };

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <div className="mx-auto flex max-w-xl flex-col px-4 py-6 md:py-10">
        <header className="flex flex-col gap-4 border-b-2 border-ink pb-5">
          <div className="caption flex items-center justify-between gap-3">
            <a href="/" className="underline underline-offset-4 hover:text-burning">
              ← {f.backToGame}
            </a>
            <button
              type="button"
              lang={t.otherLanguage.lang}
              onClick={() => setLang(t.otherLanguage.lang)}
              className="border-2 border-ink px-2 py-1 hover:bg-ink hover:text-paper"
            >
              <span aria-hidden="true">{t.otherLanguage.short}</span>
              <span className="sr-only">{t.otherLanguage.name}</span>
            </button>
          </div>
          <p className="caption text-muted">{t.title}</p>
          <h1 className="headline text-[64px] md:text-[88px]">{f.pageTitle}.</h1>
          <p className="text-[15px] leading-snug text-muted">{f.intro}</p>
        </header>

        {status === 'sent' ? (
          <section className="flex flex-col gap-4 py-10">
            <h2 ref={thanks} tabIndex={-1} className="headline text-6xl text-burning outline-none">
              {f.thanks}
            </h2>
            <p className="text-[15px] text-muted">{f.thanksSub}</p>
            <a
              href="/"
              className="headline self-start bg-ink px-5 py-4 text-3xl text-paper hover:bg-burning"
            >
              {f.backToGame} →
            </a>
          </section>
        ) : (
          <form onSubmit={(e) => void submit(e)} noValidate className="flex flex-col gap-7 pt-6">
            <Question n={1} title={f.device} required>
              <Choice name="device" options={f.devices} value={device} onChange={setDevice} />
            </Question>

            <Question n={2} title={f.rating} hint={f.ratingHint} required>
              <div className="grid grid-cols-5 border-2 border-ink">
                {SCALE.map((s, i) => (
                  <label
                    key={s.band}
                    className="flex h-12 cursor-pointer items-end justify-center pb-1 transition-colors not-first:border-l-2 not-first:border-ink has-focus-visible:outline-3 has-focus-visible:outline-hot motion-reduce:transition-none"
                    style={{ background: rating && i < rating ? s.color : 'transparent' }}
                  >
                    <input
                      type="radio"
                      name="rating"
                      value={i + 1}
                      checked={rating === i + 1}
                      onChange={() => setRating(i + 1)}
                      className="sr-only"
                    />
                    <span className="caption text-[11px]">{i + 1}</span>
                    <span className="sr-only">{t.bands[s.band]}</span>
                  </label>
                ))}
              </div>
              <div className="caption mt-1.5 grid grid-cols-5 text-[10px]" aria-hidden="true">
                {SCALE.map((s, i) => (
                  <span key={s.band} className={rating === i + 1 ? 'font-semibold' : 'text-muted'}>
                    {t.bands[s.band]}
                  </span>
                ))}
              </div>
            </Question>

            <Question n={3} title={f.again}>
              <Choice name="again" options={f.agains} value={again} onChange={setAgain} />
            </Question>

            <Question n={4} title={f.problems} hint={f.problemsHint}>
              <textarea
                aria-label={f.problems}
                rows={3}
                maxLength={2000}
                value={problems}
                onChange={(e) => setProblems(e.target.value)}
                className={FIELD}
              />
            </Question>

            <Question n={5} title={f.ideas} hint={f.ideasHint}>
              <textarea
                aria-label={f.ideas}
                rows={4}
                maxLength={2000}
                value={ideas}
                onChange={(e) => setIdeas(e.target.value)}
                className={FIELD}
              />
            </Question>

            <Question n={6} title={f.setup} hint={f.setupHint}>
              <input
                aria-label={f.setup}
                maxLength={200}
                value={setup}
                onChange={(e) => setSetup(e.target.value)}
                className={FIELD}
              />
            </Question>

            {/* Honeypot: invisible to people, tempting to bots. */}
            <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
              <label>
                Website
                <input
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </label>
            </div>

            {error && (
              <p role="alert" className="border-2 border-burning p-3 text-sm font-semibold">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={status === 'sending'}
              className="headline bg-ink px-5 py-5 text-4xl text-paper transition-colors hover:bg-burning disabled:opacity-60"
            >
              {status === 'sending' ? f.sending : `${f.submit} →`}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
