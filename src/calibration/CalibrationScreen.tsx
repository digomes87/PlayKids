import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useSettingsStore } from '../app/settingsStore';
import { errorMessage } from '../app/useAsync';
import { WebAudioPlayer } from '../audio/webAudioPlayer';
import { contentUrl } from '../content/paths';
import { CALIBRATION_TRACK, REQUIRED_TAPS, computeLatencyOffsetMs } from './latency';
import '../parents/parents.css';

const BEAT_SEC = 60 / CALIBRATION_TRACK.bpm;

type Phase = 'loading' | 'ready' | 'tapping' | 'done';

export function CalibrationScreen() {
  const isUnlocked = useSettingsStore((state) => state.isParentUnlocked);
  const saveLatencyOffset = useSettingsStore((state) => state.saveLatencyOffset);
  const navigate = useNavigate();

  const playerRef = useRef<WebAudioPlayer | null>(null);
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>('loading');
  const [taps, setTaps] = useState<readonly number[]>([]);
  const [offsetMs, setOffsetMs] = useState<number | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    const player = new WebAudioPlayer();
    let isDisposed = false;
    playerRef.current = player;
    setPhase('loading');
    setTaps([]);
    setOffsetMs(null);

    player.load(contentUrl(CALIBRATION_TRACK.src)).then(
      () => {
        if (!isDisposed) setPhase('ready');
      },
      (error: unknown) => {
        console.error(error);
        if (!isDisposed) setProblem(errorMessage(error));
      },
    );
    return () => {
      isDisposed = true;
      playerRef.current = null;
      player.dispose();
    };
  }, [round]);

  if (!isUnlocked) return <Navigate to="/parents" replace />;

  const restart = (message: string | null = null) => {
    setProblem(message);
    setRound((value) => value + 1);
  };

  const start = () => {
    const player = playerRef.current;
    if (!player) return;
    player.setPlaybackRate(1);
    player.play().then(
      () => setPhase('tapping'),
      (error: unknown) => {
        console.error(error);
        setProblem(`Não foi possível tocar o som. ${errorMessage(error)}`);
      },
    );
  };

  const tap = () => {
    const player = playerRef.current;
    if (!player || phase !== 'tapping') return;
    if (player.hasEnded()) {
      restart('O som acabou antes de terminar. Vamos de novo.');
      return;
    }
    const nextTaps = [...taps, player.getCurrentTime()];
    setTaps(nextTaps);
    const measured = computeLatencyOffsetMs(nextTaps, BEAT_SEC);
    if (measured === null) return;
    player.pause();
    setOffsetMs(measured);
    setPhase('done');
  };

  const save = () => {
    if (offsetMs === null) return;
    saveLatencyOffset(offsetMs).then(
      () => navigate('/parents'),
      (error: unknown) => {
        console.error(error);
        setProblem(`Não foi possível salvar. ${errorMessage(error)}`);
      },
    );
  };

  return (
    <main className="screen parents calibration">
      <header className="parents__header">
        <Link to="/parents" className="icon-button" aria-label="Voltar para a área dos pais">
          ←
        </Link>
        <h1>Calibração de latência</h1>
      </header>

      <section className="panel calibration__panel">
        <p>
          Use o mesmo volume e os mesmos fones que a criança vai usar. Toque no botão grande junto com cada clique, {REQUIRED_TAPS}{' '}
          vezes. Os primeiros toques servem só para pegar o ritmo.
        </p>

        {problem && (
          <p className="notice notice--warn" role="alert">
            {problem}
          </p>
        )}

        {phase === 'loading' && !problem && <p>Carregando som…</p>}

        {phase === 'ready' && (
          <button type="button" className="button button--sun button--huge" onClick={start}>
            Começar
          </button>
        )}

        {phase === 'tapping' && (
          <button type="button" className="calibration__pad" onClick={tap}>
            <span className="calibration__count" aria-live="polite">
              {taps.length} / {REQUIRED_TAPS}
            </span>
            Toque no clique
          </button>
        )}

        {phase === 'done' && offsetMs !== null && (
          <>
            <p className="calibration__result" role="status">
              Atraso medido: <strong>{offsetMs} ms</strong>
            </p>
            <div className="panel__actions">
              <button type="button" className="button button--sun" onClick={save}>
                Salvar
              </button>
              <button type="button" className="button" onClick={() => restart()}>
                Medir de novo
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
