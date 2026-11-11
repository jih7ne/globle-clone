import { useT } from '../i18n/context';
import { SidePanel } from './SidePanel';

/** FR-20: what the game is, where the data comes from, how it is tested. */
export function AboutPanel({ onClose }: { onClose: () => void }) {
  const { t: en } = useT();
  return (
    <SidePanel title={en.about} onClose={onClose}>
      <div className="flex flex-col">
        {en.aboutSections.map((s) => (
          <section key={s.title} className="border-b-2 border-ink p-5">
            <h3 className="mb-2 text-lg font-extrabold uppercase">{s.title}</h3>
            <p className="text-[15px] leading-relaxed">{s.body}</p>
          </section>
        ))}
        <a
          href="/feedback"
          className="headline border-b-2 border-ink bg-burning p-5 text-3xl text-paper transition-colors hover:bg-ink"
        >
          {en.aboutFeedback} →
        </a>
        <a
          href={en.repoUrl}
          target="_blank"
          rel="noreferrer"
          className="headline bg-ink p-5 text-3xl text-paper transition-colors hover:bg-burning"
        >
          {en.aboutRepo} →
        </a>
      </div>
    </SidePanel>
  );
}
