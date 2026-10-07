import type { PromptRendererProps } from './types';

const SPOKEN_OPERATOR = { '+': 'mais', '-': 'menos' } as const;
const DISPLAY_OPERATOR = { '+': '+', '-': '−' } as const;

export function EquationRenderer({ prompt }: PromptRendererProps<'equation'>) {
  const { left, operator, right } = prompt;
  return (
    <p className="prompt-equation" aria-label={`Quanto é ${left} ${SPOKEN_OPERATOR[operator]} ${right}?`}>
      <span className="prompt-equation__tile">{left}</span>
      <span className="prompt-equation__operator">{DISPLAY_OPERATOR[operator]}</span>
      <span className="prompt-equation__tile">{right}</span>
      <span className="prompt-equation__operator">=</span>
      <span className="prompt-equation__tile prompt-equation__tile--unknown">?</span>
    </p>
  );
}
