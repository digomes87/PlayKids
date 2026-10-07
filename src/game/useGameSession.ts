import { useCallback, useEffect, useRef } from 'react';
import { errorMessage } from '../app/useAsync';
import { useSettingsStore } from '../app/settingsStore';
import { unlockSpeech } from '../audio/speech';
import { WebAudioPlayer } from '../audio/webAudioPlayer';
import { contentUrl } from '../content/paths';
import type { Chapter, Prompt } from '../content/schema';
import { GameEngine, type ChallengeResult, type EngineEvent, type EngineSummary } from '../engine';
import { mergeChapterResult, progressRepository, type Attempt } from '../progress';
import { useGameStore } from './gameStore';

const MS_PER_SEC = 1000;
const toMs = (seconds: number | null) => (seconds === null ? null : Math.round(seconds * MS_PER_SEC));

function toAttempt(chapterId: string, result: ChallengeResult<Prompt>): Attempt {
  const { challenge } = result;
  return {
    chapterId,
    challengeId: challenge.id,
    skill: challenge.skill,
    promptType: challenge.prompt.type,
    outcome: result.outcome,
    selected: result.selected,
    answer: challenge.answer,
    reactionMs: toMs(result.reactionSec),
    timingErrorMs: toMs(result.timingErrorSec),
    playbackRate: result.playbackRate,
    at: new Date().toISOString(),
  };
}

async function saveChapterRun(chapterId: string, summary: EngineSummary): Promise<void> {
  const previous = (await progressRepository.listChapterResults()).find((result) => result.chapterId === chapterId);
  const merged = mergeChapterResult(previous, {
    chapterId,
    total: summary.total,
    hits: summary.hits,
    completedAt: new Date().toISOString(),
  });
  await progressRepository.saveChapterResult(merged);
}

/**
 * Liga o motor ao mundo web: carrega o áudio, roda o tick em requestAnimationFrame,
 * espelha os eventos na store e grava o progresso.
 * `onFrame` recebe a fração da janela do desafio a cada quadro (fora do React, sem re-render).
 */
export function useGameSession(chapter: Chapter, onFrame: (progress: number | null) => void) {
  const engineRef = useRef<GameEngine<Prompt> | null>(null);
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;
  const latencyOffsetMs = useSettingsStore((state) => state.latencyOffsetMs);

  useEffect(() => {
    const { reset, patch, addOutcome } = useGameStore.getState();
    reset();

    const player = new WebAudioPlayer();
    let engine: GameEngine<Prompt> | null = null;
    let isDisposed = false;
    let frame = 0;

    const reportSaveFailure = (error: unknown) => {
      console.error('Não foi possível salvar o progresso.', error);
      if (!isDisposed) patch({ hasSaveFailed: true });
    };

    const loop = () => {
      if (!engine) return;
      engine.tick();
      onFrameRef.current(engine.getActiveProgress());
      if (engine.getStatus() === 'running') frame = requestAnimationFrame(loop);
    };

    const handleEvent = (event: EngineEvent<Prompt>) => {
      switch (event.type) {
        case 'started':
        case 'resumed':
          patch({ phase: 'playing' });
          frame = requestAnimationFrame(loop);
          break;
        case 'paused':
          cancelAnimationFrame(frame);
          patch({ phase: 'paused' });
          break;
        case 'challenge_opened':
          patch({ shown: event.challenge, result: null });
          break;
        case 'challenge_resolved':
          addOutcome(event.result);
          progressRepository.recordAttempt(toAttempt(chapter.id, event.result)).catch(reportSaveFailure);
          break;
        case 'tempo_changed':
          patch({ rate: event.to });
          break;
        case 'finished':
          cancelAnimationFrame(frame);
          patch({ phase: 'finished', summary: event.summary });
          saveChapterRun(chapter.id, event.summary).catch(reportSaveFailure);
          break;
      }
    };

    player
      .load(contentUrl(chapter.audio.src))
      .then(() => {
        if (isDisposed) return;
        engine = new GameEngine<Prompt>({
          player,
          challenges: chapter.challenges,
          latencyOffsetSec: (latencyOffsetMs ?? 0) / MS_PER_SEC,
        });
        engine.subscribe(handleEvent);
        engineRef.current = engine;
        patch({ phase: 'ready' });
      })
      .catch((error: unknown) => {
        console.error(error);
        if (!isDisposed) patch({ phase: 'error', error: errorMessage(error) });
      });

    const pauseWhenHidden = () => {
      if (document.hidden) engine?.pause();
    };
    document.addEventListener('visibilitychange', pauseWhenHidden);

    return () => {
      isDisposed = true;
      cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', pauseWhenHidden);
      engineRef.current = null;
      player.dispose();
      reset();
    };
  }, [chapter, latencyOffsetMs]);

  const reportPlaybackFailure = useCallback((error: unknown) => {
    console.error(error);
    useGameStore.getState().patch({ phase: 'error', error: `Não foi possível tocar a música. ${errorMessage(error)}` });
  }, []);

  /** Precisa ser chamado direto do toque no botão: é o gesto que libera o áudio no iOS. */
  const start = useCallback(() => {
    unlockSpeech();
    engineRef.current?.start().catch(reportPlaybackFailure);
  }, [reportPlaybackFailure]);

  const resume = useCallback(() => {
    engineRef.current?.resume().catch(reportPlaybackFailure);
  }, [reportPlaybackFailure]);

  const pause = useCallback(() => engineRef.current?.pause(), []);
  const answer = useCallback((value: number) => engineRef.current?.answer(value), []);

  return { start, resume, pause, answer };
}
