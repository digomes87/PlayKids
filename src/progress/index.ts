import { createIdbProgressRepository } from './idbRepository';
import type { ProgressRepository } from './types';

export * from './types';
export * from './mastery';

/** Único ponto de troca da implementação (ex.: uma versão com sync remoto). */
export const progressRepository: ProgressRepository = createIdbProgressRepository();
