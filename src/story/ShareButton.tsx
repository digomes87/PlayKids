import { useState } from 'react';
import { errorMessage } from '../app/useAsync';
import type { EngineSummary } from '../engine';
import { GateChallenge } from '../parents/ParentalGate';
import { starsFor } from '../progress';
import { appUrl, browserShareEnvironment, buildShareData, shareResult, type ShareOutcome } from './share';

const OUTCOME_MESSAGE: Record<ShareOutcome, string | null> = {
  shared: null,
  cancelled: null,
  copied: 'Resultado copiado! Cole onde quiser compartilhar.',
  unsupported: 'Este navegador não permite compartilhar.',
};

interface ShareButtonProps {
  readonly chapterTitle: string;
  readonly summary: EngineSummary;
}

/**
 * Compartilhar leva para fora do jogo (redes sociais), então passa pelo portão
 * dos pais: quem publica é o adulto, nunca a criança.
 */
export function ShareButton({ chapterTitle, summary }: ShareButtonProps) {
  const [isGateOpen, setIsGateOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Chamado direto do envio do portão: a Web Share API exige um gesto do usuário.
  const share = () => {
    setIsGateOpen(false);
    const data = buildShareData(chapterTitle, summary, starsFor(summary.accuracy), appUrl());
    shareResult(data, browserShareEnvironment()).then(
      (outcome) => setMessage(OUTCOME_MESSAGE[outcome]),
      (error: unknown) => {
        console.error(error);
        setMessage(`Não foi possível compartilhar. ${errorMessage(error)}`);
      },
    );
  };

  return (
    <>
      <button type="button" className="button button--small share-button" onClick={() => setIsGateOpen(true)}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 15V3M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
        </svg>
        Compartilhar
      </button>
      {message && (
        <p className="notice notice--ok" role="status">
          {message}
        </p>
      )}
      {isGateOpen && (
        <div className="overlay" role="dialog" aria-modal="true" aria-label="Confirmação de adulto para compartilhar">
          <GateChallenge onUnlock={share} onCancel={() => setIsGateOpen(false)} submitLabel="Compartilhar" />
        </div>
      )}
    </>
  );
}
