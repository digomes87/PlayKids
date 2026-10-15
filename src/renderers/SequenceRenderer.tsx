import type { CSSProperties } from 'react';
import type { PromptRendererProps } from './types';

export function SequenceRenderer({ prompt }: PromptRendererProps<'sequence'>) {
  const { start, step, shown } = prompt;
  const values = Array.from({ length: shown }, (_, index) => start + step * index);
  const direction = step > 0 ? 'up' : 'down';
  return (
    <ol
      className={`prompt-sequence prompt-sequence--${direction}`}
      aria-label={`Que número vem depois de ${values.join(', ')}?`}
    >
      {values.map((value, index) => (
        <li key={index} className="prompt-sequence__tile" style={{ '--stair-index': index } as CSSProperties}>
          {value}
        </li>
      ))}
      <li
        className="prompt-sequence__tile prompt-sequence__tile--unknown"
        style={{ '--stair-index': shown } as CSSProperties}
      >
        ?
      </li>
    </ol>
  );
}
