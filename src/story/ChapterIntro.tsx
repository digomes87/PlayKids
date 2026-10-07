import { Link } from 'react-router-dom';
import { contentUrl } from '../content/paths';
import type { Chapter } from '../content/schema';
import './story.css';

interface ChapterIntroProps {
  readonly chapter: Chapter;
  /** O áudio já foi pré-carregado; só então o botão é liberado. */
  readonly isReady: boolean;
  readonly onStart: () => void;
}

export function ChapterIntro({ chapter, isReady, onStart }: ChapterIntroProps) {
  return (
    <main className="screen intro">
      <Link to="/" className="icon-button intro__back" aria-label="Voltar">
        ←
      </Link>
      {chapter.intro.image && (
        <img className="intro__art" src={contentUrl(chapter.intro.image)} alt="" width={320} height={320} />
      )}
      <section className="intro__text">
        <h1>{chapter.title}</h1>
        <p>{chapter.intro.text}</p>
        {/* O toque neste botão é o gesto que libera o áudio no iOS/Safari. */}
        <button type="button" className="button button--sun button--huge" disabled={!isReady} onClick={onStart}>
          {isReady ? 'Começar' : 'Carregando música…'}
        </button>
      </section>
    </main>
  );
}
