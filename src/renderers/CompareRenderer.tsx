import type { CSSProperties } from 'react';
import type { PromptRendererProps } from './types';

function QuantityCard({ value, side }: { readonly value: number; readonly side: 'left' | 'right' }) {
  return (
    <li className={`prompt-compare__card prompt-compare__card--${side}`}>
      <span className="prompt-compare__number">{value}</span>
      <span className="prompt-compare__dots" aria-hidden="true">
        {Array.from({ length: value }, (_, index) => (
          <span key={index} className="prompt-compare__dot" style={{ '--pop-index': index } as CSSProperties} />
        ))}
      </span>
    </li>
  );
}

export function CompareRenderer({ prompt }: PromptRendererProps<'compare'>) {
  const { left, right } = prompt;
  return (
    <ul className="prompt-compare" aria-label={`Qual é maior: ${left} ou ${right}?`}>
      <QuantityCard value={left} side="left" />
      <QuantityCard value={right} side="right" />
    </ul>
  );
}
