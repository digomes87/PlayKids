import type { ComponentType } from 'react';
import type { Prompt, PromptType } from '../content/schema';
import { EquationRenderer } from './EquationRenderer';
import { ImageCountRenderer } from './ImageCountRenderer';
import { NumberAudioRenderer } from './NumberAudioRenderer';
import type { PromptRendererProps } from './types';
import './renderers.css';

/**
 * Mapa prompt.type -> componente. O tipo mapeado obriga a registrar um renderer
 * para cada tipo do schema: esquecer um novo tipo aqui é erro de compilação.
 */
const RENDERERS: { readonly [TType in PromptType]: ComponentType<PromptRendererProps<TType>> } = {
  image_count: ImageCountRenderer,
  equation: EquationRenderer,
  number_audio: NumberAudioRenderer,
};

export function PromptView({ prompt }: { readonly prompt: Prompt }) {
  const Renderer = RENDERERS[prompt.type] as ComponentType<PromptRendererProps>;
  return <Renderer prompt={prompt} />;
}
