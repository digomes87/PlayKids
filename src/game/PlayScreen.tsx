import { useCallback, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ErrorPanel } from '../app/ErrorPanel';
import { useAsync } from '../app/useAsync';
import { loadChapter } from '../content/loader';
import type { Chapter } from '../content/schema';
import { ChapterIntro } from '../story/ChapterIntro';
import { ChapterReward } from '../story/ChapterReward';
import { GameBoard } from './GameBoard';
import { useGameStore } from './gameStore';
import { useGameSession } from './useGameSession';
import './game.css';

interface GameSessionProps {
  readonly chapter: Chapter;
  readonly onReplay: () => void;
}

function GameSession({ chapter, onReplay }: GameSessionProps) {
  const timerRef = useRef<HTMLDivElement | null>(null);
  const handleFrame = useCallback((progress: number | null) => {
    timerRef.current?.style.setProperty('--progress', String(progress ?? 0));
  }, []);
  const session = useGameSession(chapter, handleFrame);

  const phase = useGameStore((state) => state.phase);
  const summary = useGameStore((state) => state.summary);
  const error = useGameStore((state) => state.error);
  const hasSaveFailed = useGameStore((state) => state.hasSaveFailed);

  if (phase === 'error') return <ErrorPanel message={error ?? 'Erro desconhecido.'} onRetry={onReplay} />;
  if (phase === 'loading' || phase === 'ready') {
    return <ChapterIntro chapter={chapter} isReady={phase === 'ready'} onStart={session.start} />;
  }
  if (phase === 'finished' && summary) {
    return <ChapterReward chapter={chapter} summary={summary} hasSaveFailed={hasSaveFailed} onReplay={onReplay} />;
  }
  return (
    <GameBoard
      chapter={chapter}
      timerRef={timerRef}
      onAnswer={session.answer}
      onPause={session.pause}
      onResume={session.resume}
    />
  );
}

export function PlayScreen() {
  const { chapterId = '' } = useParams();
  const chapter = useAsync(() => loadChapter(chapterId), [chapterId]);
  const [run, setRun] = useState(0);

  if (chapter.status === 'loading') {
    return (
      <main className="screen screen--center" aria-busy="true">
        <p className="loading-note">Carregando…</p>
      </main>
    );
  }
  if (chapter.status === 'error') return <ErrorPanel message={chapter.message} onRetry={chapter.reload} />;

  // A key recria a sessão inteira (player, motor e store) em "Jogar de novo".
  return <GameSession key={run} chapter={chapter.data} onReplay={() => setRun((value) => value + 1)} />;
}
