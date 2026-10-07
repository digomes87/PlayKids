import { z } from 'zod';

export const CHAPTER_SCHEMA_VERSION = 1;

const assetPath = z
  .string()
  .min(1)
  .refine((path) => !path.startsWith('/') && !path.includes('..') && !/^[a-z]+:/i.test(path), {
    message: 'Use um caminho relativo a public/content/ (sem URL externa).',
  });

const smallInt = z.number().int().min(0).max(99);

export const imageCountPromptSchema = z.object({
  type: z.literal('image_count'),
  image: assetPath,
  count: z.number().int().min(1).max(12),
});

export const equationPromptSchema = z.object({
  type: z.literal('equation'),
  left: smallInt,
  operator: z.enum(['+', '-']),
  right: smallInt,
});

export const numberAudioPromptSchema = z.object({
  type: z.literal('number_audio'),
  value: smallInt,
  /** Gravação opcional do número falado; sem ela o app usa a síntese de voz do aparelho. */
  audio: assetPath.optional(),
});

/** Para adicionar um novo prompt.type: crie o schema acima e inclua-o nesta união. */
export const promptSchema = z.discriminatedUnion('type', [
  imageCountPromptSchema,
  equationPromptSchema,
  numberAudioPromptSchema,
]);

export type Prompt = z.infer<typeof promptSchema>;
export type PromptType = Prompt['type'];

export function expectedAnswer(prompt: Prompt): number {
  switch (prompt.type) {
    case 'image_count':
      return prompt.count;
    case 'equation':
      return prompt.operator === '+' ? prompt.left + prompt.right : prompt.left - prompt.right;
    case 'number_audio':
      return prompt.value;
  }
}

export const challengeSchema = z
  .object({
    id: z.string().min(1),
    skill: z.string().min(1),
    showAt: z.number().min(0),
    targetAt: z.number().min(0),
    closeAt: z.number().min(0),
    prompt: promptSchema,
    options: z.array(smallInt).min(2).max(4),
    answer: smallInt,
  })
  .superRefine((challenge, ctx) => {
    if (!(challenge.showAt < challenge.targetAt && challenge.targetAt <= challenge.closeAt)) {
      ctx.addIssue({ code: 'custom', message: 'Esperado showAt < targetAt <= closeAt.', path: ['targetAt'] });
    }
    if (new Set(challenge.options).size !== challenge.options.length) {
      ctx.addIssue({ code: 'custom', message: 'Opções repetidas.', path: ['options'] });
    }
    if (!challenge.options.includes(challenge.answer)) {
      ctx.addIssue({ code: 'custom', message: 'A resposta não está entre as opções.', path: ['answer'] });
    }
    if (challenge.answer !== expectedAnswer(challenge.prompt)) {
      ctx.addIssue({ code: 'custom', message: 'A resposta não bate com o prompt.', path: ['answer'] });
    }
  });

export type ChapterChallenge = z.infer<typeof challengeSchema>;

export const chapterSchema = z
  .object({
    schemaVersion: z.literal(CHAPTER_SCHEMA_VERSION),
    id: z.string().regex(/^[a-z0-9-]+$/),
    title: z.string().min(1),
    intro: z.object({ text: z.string().min(1), image: assetPath.optional() }),
    reward: z.object({ text: z.string().min(1), sticker: assetPath }),
    audio: z.object({
      src: assetPath,
      bpm: z.number().positive(),
      durationSec: z.number().positive(),
    }),
    challenges: z.array(challengeSchema).min(1),
  })
  .superRefine((chapter, ctx) => {
    const seen = new Set<string>();
    chapter.challenges.forEach((challenge, index) => {
      if (seen.has(challenge.id)) {
        ctx.addIssue({ code: 'custom', message: `id repetido: ${challenge.id}`, path: ['challenges', index, 'id'] });
      }
      seen.add(challenge.id);

      const previous = chapter.challenges[index - 1];
      if (previous && challenge.showAt < previous.closeAt) {
        ctx.addIssue({
          code: 'custom',
          message: `Começa antes de "${previous.id}" fechar.`,
          path: ['challenges', index, 'showAt'],
        });
      }
      if (challenge.closeAt > chapter.audio.durationSec) {
        ctx.addIssue({
          code: 'custom',
          message: 'A janela termina depois do fim do áudio.',
          path: ['challenges', index, 'closeAt'],
        });
      }
    });
  });

export type Chapter = z.infer<typeof chapterSchema>;

export const contentIndexSchema = z.object({
  chapters: z
    .array(
      z.object({
        id: z.string().regex(/^[a-z0-9-]+$/),
        title: z.string().min(1),
        file: assetPath,
        cover: assetPath,
      }),
    )
    .min(1),
});

export type ContentIndex = z.infer<typeof contentIndexSchema>;
export type ChapterEntry = ContentIndex['chapters'][number];
