import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { resolveInput, search, type NameIndex } from '@gw/shared';
import { useT } from '../i18n/context';

interface Props {
  index: NameIndex;
  guessed: ReadonlySet<string>;
  disabled: boolean;
  onGuess: (code: string) => void;
}

type Feedback = { kind: 'suggest'; code: string } | { kind: 'error'; message: string } | null;

/**
 * Country input: an ARIA combobox with autocomplete (FR-02, FR-03) and the
 * "Did you mean?" prompt for typos (FR-22).
 */
export function GuessInput({ index, guessed, disabled, onGuess }: Props) {
  const { t: en } = useT();
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const yesRef = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const name = (code: string) => index.byCode.get(code)?.name[index.lang] ?? code;

  const options = useMemo(
    () => (text.trim() ? search(index, text, 8).filter((c) => !guessed.has(c)) : []),
    [index, text, guessed],
  );
  const expanded = open && options.length > 0;

  useEffect(() => {
    if (feedback?.kind === 'suggest') yesRef.current?.focus();
  }, [feedback]);

  const submitCode = (code: string) => {
    onGuess(code);
    setText('');
    setOpen(false);
    setActive(-1);
    setFeedback(null);
    inputRef.current?.focus();
  };

  const submitText = () => {
    if (!text.trim()) return;
    const result = resolveInput(index, text, guessed);
    if (result.kind === 'match') submitCode(result.code);
    else if (result.kind === 'suggest') {
      setOpen(false);
      setFeedback({ kind: 'suggest', code: result.code });
    } else if (result.kind === 'already') {
      setFeedback({ kind: 'error', message: en.alreadyGuessed(name(result.code)) });
    } else {
      setFeedback({ kind: 'error', message: en.unknownCountry(text.trim()) });
    }
  };

  const dismissSuggestion = () => {
    setFeedback(null);
    inputRef.current?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && options.length) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % options.length);
    } else if (e.key === 'ArrowUp' && options.length) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i <= 0 ? options.length - 1 : i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const chosen = expanded && active >= 0 ? options[active] : undefined;
      if (chosen) submitCode(chosen);
      else submitText();
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActive(-1);
    }
  };

  return (
    <div className="relative">
      <form
        className="flex border-2 border-ink bg-white focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-hot"
        onSubmit={(e) => {
          e.preventDefault();
          submitText();
        }}
      >
        <label htmlFor={`${listId}-input`} className="sr-only">
          {en.inputLabel}
        </label>
        <input
          ref={inputRef}
          id={`${listId}-input`}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-activedescendant={expanded && active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete="off"
          spellCheck={false}
          placeholder={en.inputPlaceholder}
          disabled={disabled}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
            setActive(-1);
            if (feedback?.kind === 'error') setFeedback(null);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          className="min-w-0 flex-1 bg-transparent px-3 py-3 text-lg font-semibold uppercase outline-none placeholder:text-muted/70 placeholder:normal-case focus-visible:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled || !text.trim()}
          className="headline bg-ink px-5 text-2xl text-paper transition-colors hover:bg-burning disabled:bg-ink/30"
        >
          {en.submit}
        </button>
      </form>

      <ul
        id={listId}
        role="listbox"
        aria-label={en.inputLabel}
        hidden={!expanded}
        className="absolute z-20 max-h-72 w-full overflow-auto border-2 border-t-0 border-ink bg-white"
      >
        {options.map((code, i) => (
          <li
            key={code}
            id={`${listId}-${i}`}
            role="option"
            aria-selected={i === active}
            className={`cursor-pointer border-b border-ink/15 px-3 py-2 font-semibold uppercase last:border-b-0 ${
              i === active ? 'bg-ink text-paper' : 'hover:bg-paper'
            }`}
            onMouseDown={(e) => {
              e.preventDefault();
              submitCode(code);
            }}
          >
            {name(code)}
          </li>
        ))}
      </ul>

      <div aria-live="polite" className="text-sm">
        {feedback?.kind === 'error' && (
          <p className="mt-2 font-semibold text-burning">{feedback.message}</p>
        )}
        {feedback?.kind === 'suggest' && (
          <div
            className="mt-2 flex flex-wrap items-center gap-3 border-2 border-ink bg-warm px-3 py-2"
            onKeyDown={(e) => {
              if (e.key === 'Escape') dismissSuggestion();
            }}
          >
            <span className="headline flex-1 text-2xl">
              {en.didYouMean} {name(feedback.code)}?
            </span>
            <button
              ref={yesRef}
              type="button"
              className="caption border-2 border-ink bg-ink px-3 py-1.5 text-paper"
              onClick={() => submitCode(feedback.code)}
            >
              {en.yes}
            </button>
            <button
              type="button"
              className="caption border-2 border-ink px-3 py-1.5 hover:bg-ink/10"
              onClick={dismissSuggestion}
            >
              {en.no}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
