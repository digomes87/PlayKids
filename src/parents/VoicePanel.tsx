import { useState } from 'react';
import { useSettingsStore } from '../app/settingsStore';
import { unlockClips } from '../audio/clipPlayer';
import { NUMBER_VOICES, recordedNumberPath, type NumberVoice } from '../audio/numberVoices';
import { speakNumber } from '../audio/speech';
import { contentUrl } from '../content/paths';
import { logDiagnostic } from '../diagnostics';

const VOICE_LABEL: Record<NumberVoice, string> = {
  luciana: 'Luciana',
  flo: 'Flo',
  reed: 'Reed',
  device: 'Voz do aparelho',
};

const VOICE_HINT: Record<NumberVoice, string> = {
  luciana: 'gravada, feminina',
  flo: 'gravada, feminina e animada',
  reed: 'gravada, masculina',
  device: 'muda de aparelho para aparelho',
};

const PREVIEW_NUMBER = 5;

function preview(voice: NumberVoice): void {
  unlockClips();
  const path = recordedNumberPath(voice, PREVIEW_NUMBER);
  speakNumber(PREVIEW_NUMBER, path ? contentUrl(path) : null);
}

/** Escolha da voz que fala os números nos desafios "que número você ouviu?". */
export function VoicePanel() {
  const numberVoice = useSettingsStore((state) => state.numberVoice);
  const saveNumberVoice = useSettingsStore((state) => state.saveNumberVoice);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'failed'>('idle');

  const choose = (voice: NumberVoice) => {
    logDiagnostic('number_voice_chosen', { voice });
    setSaveStatus('idle');
    saveNumberVoice(voice)
      .then(() => setSaveStatus('saved'))
      .catch((error: unknown) => {
        console.error('Não foi possível salvar a voz.', error);
        setSaveStatus('failed');
      });
  };

  return (
    <section className="panel" aria-labelledby="voice-heading">
      <h2 id="voice-heading">Voz dos números</h2>
      <p>Quem fala o número nos desafios de ouvir. Toque em "Ouvir" para comparar e escolha a que a criança entende melhor.</p>
      {saveStatus === 'failed' && (
        <p className="notice notice--warn" role="alert">
          Não foi possível salvar a escolha neste aparelho.
        </p>
      )}
      {saveStatus === 'saved' && (
        <p className="notice notice--ok" role="status">
          Voz salva: {VOICE_LABEL[numberVoice]}.
        </p>
      )}
      <fieldset className="voice-list">
        <legend className="visually-hidden">Voz dos números</legend>
        {NUMBER_VOICES.map((voice) => (
          <div key={voice} className="voice-option">
            <label className="voice-option__choice">
              <input
                type="radio"
                name="number-voice"
                value={voice}
                checked={numberVoice === voice}
                onChange={() => choose(voice)}
              />
              <span>
                <strong>{VOICE_LABEL[voice]}</strong> <small>{VOICE_HINT[voice]}</small>
              </span>
            </label>
            <button
              type="button"
              className="button button--small"
              onClick={() => preview(voice)}
              aria-label={`Ouvir ${VOICE_LABEL[voice]}`}
            >
              Ouvir
            </button>
          </div>
        ))}
      </fieldset>
    </section>
  );
}
