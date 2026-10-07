import type { CSSProperties, RefObject } from 'react';
import { Link } from 'react-router-dom';
import type { Chapter } from '../content/schema';
import type { Outcome } from '../engine';
import { PromptView } from '../renderers/registry';
import { useGameStore } from './gameStore';

const FEEDBACK: Record<Outcome, string> = {
  hit: 'Isso!',
  miss: 'Quase!',
  timeout: 'Vamos na próxima!',
};

const SLOW_RATE = 0.8;
const FAST_RATE = 1;

function tempoLabel(rate: number): string {
  if (rate < SLOW_RATE) return '🐢 Devagar';
  if (rate < FAST_RATE) return '🐱 Médio';
  return '🐇 Rápido';
}

interface GameBoardProps {
  readonly chapter: Chapter;
  readonly timerRef: RefObject<HTMLDivElement | null>;
  readonly onAnswer: (value: number) => void;
  readonly onPause: () => void;
  readonly onResume: () => void;
}

export function GameBoard({ chapter, timerRef, onAnswer, onPause, onResume }: GameBoardProps) {
  const phase = useGameStore((state) => state.phase);
  const shown = useGameStore((state) => state.shown);
  const result = useGameStore((state) => state.result);
  const outcomes = useGameStore((state) => state.outcomes);
  const rate = useGameStore((state) => state.rate);

  const optionState = (option: number) => {
    if (!result) return 'idle';
    if (option === result.challenge.answer) return 'correct';
    return option === result.selected ? 'wrong' : 'dim';
  };

  // Posição da batida-alvo na barra de tempo, que esvazia da direita para a esquerda.
  const targetFraction = shown ? (shown.targetAt - shown.showAt) / (shown.closeAt - shown.showAt) : 0;

  return (
    <main className="screen game">
      <header className="game__bar">
        <Link to="/" className="icon-button" aria-label="Sair do capítulo">
          ✕
        </Link>
        <ol className="game__dots" aria-label={`Desafio ${outcomes.length} de ${chapter.challenges.length}`}>
          {chapter.challenges.map((challenge, index) => (
            <li key={challenge.id} className={`game__dot game__dot--${outcomes[index] ?? 'pending'}`} />
          ))}
        </ol>
        <span className="tempo-badge">{tempoLabel(rate)}</span>
        <button type="button" className="icon-button" onClick={onPause} aria-label="Pausar">
          ❚❚
        </button>
      </header>

      <section className={`game__stage game__stage--${result?.outcome ?? 'open'}`}>
        {/* Chaves com prefixo: irmãos com a mesma key fariam o React deixar nós antigos na tela. */}
        {shown ? (
          <PromptView key={`prompt-${shown.id}`} prompt={shown.prompt} />
        ) : (
          <p className="game__waiting">Escute a música…</p>
        )}
        {result && (
          <p key={`feedback-${result.challenge.id}`} className="game__feedback">
            {FEEDBACK[result.outcome]}
          </p>
        )}
        <div
          ref={timerRef}
          className="game__timer"
          data-active={shown !== null && result === null}
          style={{ '--target': 1 - targetFraction } as CSSProperties}
          aria-hidden="true"
        >
          <div className="game__timer-fill" />
          <div className="game__timer-target" />
        </div>
        <p className="visually-hidden" aria-live="polite">
          {result ? FEEDBACK[result.outcome] : ''}
        </p>
      </section>

      <footer className="game__options">
        {shown?.options.map((option, index) => (
          <button
            key={`${shown.id}-${option}`}
            type="button"
            className={`option option--${optionState(option)} option--tone-${index}`}
            disabled={result !== null}
            onClick={() => onAnswer(option)}
          >
            {option}
          </button>
        ))}
      </footer>

      {phase === 'paused' && (
        <div className="overlay" role="dialog" aria-modal="true" aria-label="Jogo pausado">
          <button type="button" className="button button--sun button--huge" onClick={onResume} autoFocus>
            Continuar
          </button>
          <Link to="/" className="button">
            Sair
          </Link>
        </div>
      )}
    </main>
  );
}
