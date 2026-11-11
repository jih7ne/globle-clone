import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { KEYS, writeJson } from '../lib/storage';
import { DICTIONARIES, I18nContext, initialLang, type Lang } from './context';

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    writeJson(KEYS.lang, next);
  }, []);

  const value = useMemo(() => ({ t: DICTIONARIES[lang], lang, setLang }), [lang, setLang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
