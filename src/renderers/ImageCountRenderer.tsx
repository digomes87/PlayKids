import type { CSSProperties } from 'react';
import { contentUrl } from '../content/paths';
import type { PromptRendererProps } from './types';

export function ImageCountRenderer({ prompt }: PromptRendererProps<'image_count'>) {
  const src = contentUrl(prompt.image);
  return (
    <ul className="prompt-count" aria-label={`${prompt.count} figuras para contar`}>
      {Array.from({ length: prompt.count }, (_, index) => (
        <li key={index} className="prompt-count__item" style={{ '--pop-index': index } as CSSProperties}>
          <img src={src} alt="" width={120} height={120} draggable={false} />
        </li>
      ))}
    </ul>
  );
}
