import type { Prompt, PromptType } from '../content/schema';

export interface PromptRendererProps<TType extends PromptType = PromptType> {
  readonly prompt: Extract<Prompt, { type: TType }>;
}
