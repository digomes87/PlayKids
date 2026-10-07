import { Link } from 'react-router-dom';
import { contentUrl } from '../content/paths';
import type { Chapter } from '../content/schema';
import type { EngineSummary } from '../engine';
import { starsFor } from '../progress';
import { ShareButton } from './ShareButton';
import { Stars } from './Stars';
import './story.css';

interface ChapterRewardProps {
  readonly chapter: Chapter;
  readonly summary: EngineSummary;
  readonly hasSaveFailed: boolean;
  readonly onReplay: () => void;
}

export function ChapterReward({ chapter, summary, hasSaveFailed, onReplay }: ChapterRewardProps) {
  return (
    <main className="screen reward">
      <img className="reward__sticker" src={contentUrl(chapter.reward.sticker)} alt="Figurinha nova" width={280} height={280} />
      <section className="reward__text">
        <Stars count={starsFor(summary.accuracy)} />
        <h1>{chapter.reward.text}</h1>
        <p className="reward__score">
          {summary.hits} de {summary.total} certos
        </p>
        <div className="panel__actions">
          <button type="button" className="button button--sun button--huge" onClick={onReplay}>
            Jogar de novo
          </button>
          <Link to="/" className="button">
            Voltar
          </Link>
        </div>
        <ShareButton chapterTitle={chapter.title} summary={summary} />
        {hasSaveFailed && (
          <p className="notice notice--warn" role="status">
            Não foi possível salvar o progresso neste aparelho.
          </p>
        )}
      </section>
    </main>
  );
}
