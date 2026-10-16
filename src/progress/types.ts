import { z } from 'zod';

export const attemptSchema = z.object({
  chapterId: z.string().min(1),
  challengeId: z.string().min(1),
  skill: z.string().min(1),
  promptType: z.string().min(1),
  outcome: z.enum(['hit', 'miss', 'timeout']),
  selected: z.number().nullable(),
  answer: z.number(),
  reactionMs: z.number().nullable(),
  timingErrorMs: z.number().nullable(),
  playbackRate: z.number().positive(),
  /** ISO 8601. */
  at: z.string().min(1),
});

export type Attempt = z.infer<typeof attemptSchema>;

export const chapterResultSchema = z.object({
  chapterId: z.string().min(1),
  completedAt: z.string().min(1),
  total: z.number().int().min(0),
  hits: z.number().int().min(0),
  stars: z.number().int().min(1).max(3),
  bestStars: z.number().int().min(1).max(3),
  timesCompleted: z.number().int().min(1),
});

export type ChapterResult = z.infer<typeof chapterResultSchema>;

export const settingsSchema = z.object({
  /** Latência medida na calibração; null enquanto não calibrado. */
  latencyOffsetMs: z.number().min(-500).max(1000).nullable(),
});

export type Settings = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: Settings = { latencyOffsetMs: null };

export const PROGRESS_EXPORT_FORMAT = 'playkids-progress';
export const PROGRESS_EXPORT_VERSION = 1;

export const progressExportSchema = z.object({
  format: z.literal(PROGRESS_EXPORT_FORMAT),
  version: z.literal(PROGRESS_EXPORT_VERSION),
  exportedAt: z.string().min(1),
  attempts: z.array(attemptSchema),
  chapterResults: z.array(chapterResultSchema),
  settings: settingsSchema,
});

export type ProgressExport = z.infer<typeof progressExportSchema>;

/**
 * Fronteira de persistência. A UI só conhece esta interface, então trocar o
 * IndexedDB por uma implementação com sync remoto não mexe no resto do app.
 */
export interface ProgressRepository {
  recordAttempt(attempt: Attempt): Promise<void>;
  listAttempts(): Promise<Attempt[]>;
  saveChapterResult(result: ChapterResult): Promise<void>;
  listChapterResults(): Promise<ChapterResult[]>;
  getSettings(): Promise<Settings>;
  saveSettings(settings: Settings): Promise<void>;
  exportAll(): Promise<ProgressExport>;
  /** Substitui todo o progresso local pelo conteúdo importado. */
  importAll(data: ProgressExport): Promise<void>;
  clear(): Promise<void>;
}
