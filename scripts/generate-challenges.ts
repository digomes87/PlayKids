/**
 * Gera o JSON de desafios a partir de uma lista de timestamps.
 *
 *   npm run gen:challenges -- --timestamps content-src/chapter-01.timestamps.txt \
 *     --chapter public/content/chapters/chapter-01.json
 *
 * Cada linha do arquivo de timestamps: `<segundos> [tipo] [skill]`.
 * Com --chapter, substitui `challenges` no capítulo e valida o arquivo inteiro.
 * Com --out, grava só o array de desafios. Sem nenhum dos dois, imprime no terminal.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { z } from 'zod';
import {
  DEFAULT_GENERATE_OPTIONS,
  generateChallenges,
  parseTimestamps,
  type GenerateOptions,
} from '../src/content/generateChallenges';
import { chapterSchema, promptSchema, type PromptType } from '../src/content/schema';

const { values } = parseArgs({
  options: {
    timestamps: { type: 'string' },
    chapter: { type: 'string' },
    out: { type: 'string' },
    type: { type: 'string' },
    lead: { type: 'string' },
    after: { type: 'string' },
    max: { type: 'string' },
    options: { type: 'string' },
    images: { type: 'string' },
    seed: { type: 'string' },
    prefix: { type: 'string' },
  },
});

function fail(message: string): never {
  console.error(`Erro: ${message}`);
  process.exit(1);
}

function numberFlag(name: string, raw: string | undefined, fallback: number): number {
  if (raw === undefined) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) fail(`--${name} deve ser um número (recebido "${raw}").`);
  return parsed;
}

function promptTypeFlag(raw: string | undefined): PromptType {
  if (raw === undefined) return DEFAULT_GENERATE_OPTIONS.defaultType;
  const known = promptSchema.options.map((option) => option.shape.type.value);
  const match = known.find((type) => type === raw);
  if (!match) fail(`--type deve ser um de: ${known.join(', ')}.`);
  return match;
}

if (!values.timestamps) fail('informe --timestamps <arquivo>.');

const overrides: GenerateOptions = {
  defaultType: promptTypeFlag(values.type),
  leadSec: numberFlag('lead', values.lead, DEFAULT_GENERATE_OPTIONS.leadSec),
  afterSec: numberFlag('after', values.after, DEFAULT_GENERATE_OPTIONS.afterSec),
  maxValue: numberFlag('max', values.max, DEFAULT_GENERATE_OPTIONS.maxValue),
  optionCount: numberFlag('options', values.options, DEFAULT_GENERATE_OPTIONS.optionCount),
  images: values.images ? values.images.split(',').map((image) => image.trim()) : DEFAULT_GENERATE_OPTIONS.images,
  seed: numberFlag('seed', values.seed, DEFAULT_GENERATE_OPTIONS.seed),
  idPrefix: values.prefix ?? DEFAULT_GENERATE_OPTIONS.idPrefix,
};

try {
  const entries = parseTimestamps(readFileSync(values.timestamps, 'utf8'));
  const challenges = generateChallenges(entries, overrides);
  const serialize = (data: unknown) => `${JSON.stringify(data, null, 2)}\n`;

  if (values.chapter) {
    const current: unknown = JSON.parse(readFileSync(values.chapter, 'utf8'));
    if (typeof current !== 'object' || current === null) fail(`${values.chapter} não contém um objeto JSON.`);
    const result = chapterSchema.safeParse({ ...current, challenges });
    if (!result.success) fail(`capítulo inválido:\n${z.prettifyError(result.error)}`);
    writeFileSync(values.chapter, serialize(result.data));
    console.log(`${challenges.length} desafios gravados em ${values.chapter}`);
  } else if (values.out) {
    writeFileSync(values.out, serialize(challenges));
    console.log(`${challenges.length} desafios gravados em ${values.out}`);
  } else {
    process.stdout.write(serialize(challenges));
  }
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
