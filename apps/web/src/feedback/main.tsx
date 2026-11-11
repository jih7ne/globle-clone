import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/archivo/wdth.css';
import '@fontsource/ibm-plex-mono/latin-500.css';
import '@fontsource/ibm-plex-mono/latin-600.css';
import '../index.css';
import { LangProvider } from '../i18n/LangProvider';
import { FeedbackForm } from './FeedbackForm';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <LangProvider>
      <FeedbackForm />
    </LangProvider>
  </StrictMode>,
);
