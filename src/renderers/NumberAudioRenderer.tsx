import { useEffect } from 'react';
import { canSpeak, speakNumber } from '../audio/speech';
import { contentUrl } from '../content/paths';
import type { PromptRendererProps } from './types';

export function NumberAudioRenderer({ prompt }: PromptRendererProps<'number_audio'>) {
  const clipUrl = prompt.audio ? contentUrl(prompt.audio) : undefined;
  const hasVoice = clipUrl !== undefined || canSpeak();

  useEffect(() => speakNumber(prompt.value, clipUrl), [prompt.value, clipUrl]);

  if (!hasVoice) {
    // Sem voz no aparelho, o desafio vira contagem de bolinhas em vez de ficar impossível.
    return (
      <ul className="prompt-count" aria-label={`${prompt.value} bolinhas para contar`}>
        {Array.from({ length: prompt.value }, (_, index) => (
          <li key={index} className="prompt-count__dot" />
        ))}
      </ul>
    );
  }

  return (
    <button
      type="button"
      className="prompt-audio"
      onClick={() => speakNumber(prompt.value, clipUrl)}
      aria-label="Ouvir o número de novo"
    >
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <path className="prompt-audio__speaker" d="M18 46h20l26-22v72L38 74H18z" />
        <path className="prompt-audio__wave prompt-audio__wave--near" d="M78 44q12 16 0 32" />
        <path className="prompt-audio__wave prompt-audio__wave--far" d="M90 32q22 28 0 56" />
      </svg>
      <span>Que número você ouviu?</span>
    </button>
  );
}
