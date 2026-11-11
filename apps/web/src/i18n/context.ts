import { createContext, useContext } from 'react';
import { readJson } from '../lib/storage';
import { KEYS } from '../lib/storage';
import { en, type Strings } from './en';
import { fr } from './fr';

export type Lang = Strings['lang'];
export const DICTIONARIES: Record<Lang, Strings> = { en, fr };

/** The saved choice, else the browser's language (FR-13). */
export function initialLang(): Lang {
  const saved = readJson<unknown>(KEYS.lang);
  if (saved === 'en' || saved === 'fr') return saved;
  const browser = typeof navigator === 'undefined' ? '' : navigator.language.toLowerCase();
  return browser.startsWith('fr') ? 'fr' : 'en';
}

export interface I18n {
  t: Strings;
  lang: Lang;
  setLang: (lang: Lang) => void;
}

export const I18nContext = createContext<I18n>({ t: en, lang: 'en', setLang: () => undefined });

/** The current language's strings, and a way to switch. */
export const useT = () => useContext(I18nContext);
