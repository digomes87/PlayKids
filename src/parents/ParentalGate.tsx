import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import './parents.css';

const MIN_FACTOR = 6;
const MAX_FACTOR = 9;

interface Question {
  readonly a: number;
  readonly b: number;
}

const randomFactor = () => MIN_FACTOR + Math.floor(Math.random() * (MAX_FACTOR - MIN_FACTOR + 1));
const newQuestion = (): Question => ({ a: randomFactor(), b: randomFactor() });

interface GateChallengeProps {
  readonly onUnlock: () => void;
  /** Com onCancel o portão vira um diálogo (botão "Cancelar"); sem ele, oferece voltar ao início. */
  readonly onCancel?: () => void;
  readonly submitLabel?: string;
}

/** Portão dos pais: uma conta que uma criança em fase de alfabetização ainda não resolve. */
export function GateChallenge({ onUnlock, onCancel, submitLabel = 'Entrar' }: GateChallengeProps) {
  const [question, setQuestion] = useState(newQuestion);
  const [value, setValue] = useState('');
  const [hasFailed, setHasFailed] = useState(false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (Number(value.trim()) === question.a * question.b && value.trim() !== '') {
      onUnlock();
      return;
    }
    setQuestion(newQuestion());
    setValue('');
    setHasFailed(true);
  };

  return (
    <form className="panel gate" onSubmit={submit}>
      <h1>Só para adultos</h1>
      <label htmlFor="gate-answer">
        Quanto é {question.a} × {question.b}?
      </label>
      <input
        id="gate-answer"
        className="gate__input"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        maxLength={3}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        aria-describedby={hasFailed ? 'gate-error' : undefined}
        autoFocus
      />
      {hasFailed && (
        <p id="gate-error" className="notice notice--warn" role="alert">
          Resposta errada. Tente esta outra conta.
        </p>
      )}
      <div className="panel__actions">
        <button type="submit" className="button button--sun">
          {submitLabel}
        </button>
        {onCancel ? (
          <button type="button" className="button" onClick={onCancel}>
            Cancelar
          </button>
        ) : (
          <Link to="/" className="button">
            Voltar
          </Link>
        )}
      </div>
    </form>
  );
}

export function ParentalGate({ onUnlock }: { readonly onUnlock: () => void }) {
  return (
    <main className="screen screen--center">
      <GateChallenge onUnlock={onUnlock} />
    </main>
  );
}
