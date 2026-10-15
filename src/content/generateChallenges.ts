import { expectedAnswer, type ChapterChallenge, type Prompt, type PromptType } from './schema';

export interface TimestampEntry {
  /** Batida-alvo (targetAt), em segundos a 1.0x. */
  readonly time: number;
  readonly type?: PromptType;
  readonly skill?: string;
}

export interface GenerateOptions {
  readonly defaultType: PromptType;
  /** Segundos entre o prompt aparecer e a batida-alvo. */
  readonly leadSec: number;
  /** Segundos de tolerância depois da batida-alvo. */
  readonly afterSec: number;
  /** Maior resultado permitido. */
  readonly maxValue: number;
  readonly optionCount: number;
  readonly images: readonly string[];
  readonly seed: number;
  readonly idPrefix: string;
}

export const DEFAULT_GENERATE_OPTIONS: GenerateOptions = {
  defaultType: 'image_count',
  leadSec: 2,
  afterSec: 1.333,
  maxValue: 5,
  optionCount: 3,
  images: ['images/star.svg'],
  seed: 1,
  idPrefix: 'c',
};

const DEFAULT_SKILL: Record<PromptType, string> = {
  image_count: 'counting',
  equation: 'addition',
  number_audio: 'number_recognition',
  compare: 'comparison',
  sequence: 'sequence',
};

/** Contar de 1 em 1 é o mais comum; de 2 em 2 e de trás para frente aparecem às vezes. */
const SEQUENCE_STEPS = [1, 1, 2, -1] as const;
const SEQUENCE_SHOWN = 3;

const PROMPT_TYPES = Object.keys(DEFAULT_SKILL) as readonly PromptType[];

const TIME_DECIMALS = 3;

type Random = () => number;

/** mulberry32: gerador determinístico, para o mesmo seed produzir sempre o mesmo capítulo. */
function createRandom(seed: number): Random {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), state | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

const randomInt = (random: Random, min: number, max: number) => min + Math.floor(random() * (max - min + 1));

const roundTime = (value: number) => Number(value.toFixed(TIME_DECIMALS));

function shuffle<T>(items: readonly T[], random: Random): T[] {
  return items
    .map((item) => ({ item, order: random() }))
    .sort((a, b) => a.order - b.order)
    .map(({ item }) => item);
}

function buildPrompt(type: PromptType, skill: string, options: GenerateOptions, random: Random): Prompt {
  const { maxValue, images } = options;
  switch (type) {
    case 'image_count':
      return { type, image: images[randomInt(random, 0, images.length - 1)], count: randomInt(random, 1, maxValue) };
    case 'number_audio':
      return { type, value: randomInt(random, 1, maxValue) };
    case 'equation': {
      if (skill === 'subtraction') {
        const left = randomInt(random, 1, maxValue);
        return { type, left, operator: '-', right: randomInt(random, 0, left) };
      }
      const left = randomInt(random, 1, maxValue - 1);
      return { type, left, operator: '+', right: randomInt(random, 1, maxValue - left) };
    }
    case 'compare': {
      const left = randomInt(random, 0, maxValue);
      const right = (left + randomInt(random, 1, maxValue)) % (maxValue + 1);
      return { type, left, right };
    }
    case 'sequence':
      return buildSequence(maxValue, random);
  }
}

/** Escolhe o início para todos os números (inclusive a resposta) ficarem entre 0 e maxValue. */
function buildSequence(maxValue: number, random: Random): Prompt {
  const fittingSteps = SEQUENCE_STEPS.filter((step) => Math.abs(step) * SEQUENCE_SHOWN < maxValue);
  const step = fittingSteps[randomInt(random, 0, fittingSteps.length - 1)];
  const span = Math.abs(step) * SEQUENCE_SHOWN;
  const lowest = randomInt(random, 0, maxValue - span);
  const start = step > 0 ? lowest : lowest + span;
  return { type: 'sequence', start, step, shown: SEQUENCE_SHOWN };
}

/** Na comparação, cada número fica no botão do mesmo lado em que aparece. */
function buildChoices(prompt: Prompt, optionCount: number, random: Random): number[] {
  if (prompt.type === 'compare') return [prompt.left, prompt.right];
  return buildOptions(expectedAnswer(prompt), optionCount, random);
}

/** Resposta certa + distratores vizinhos (nunca negativos), embaralhados. */
function buildOptions(answer: number, optionCount: number, random: Random): number[] {
  const neighbours = [1, -1, 2, -2, 3, -3, 4]
    .map((delta) => answer + delta)
    .filter((value) => value >= 0);
  const distractors = shuffle(neighbours.slice(0, optionCount + 1), random).slice(0, optionCount - 1);
  return shuffle([answer, ...distractors], random);
}

export function generateChallenges(
  entries: readonly TimestampEntry[],
  overrides: Partial<GenerateOptions> = {},
): ChapterChallenge[] {
  const options = { ...DEFAULT_GENERATE_OPTIONS, ...overrides };
  if (options.leadSec <= 0 || options.afterSec < 0) throw new Error('leadSec deve ser > 0 e afterSec >= 0.');
  if (options.maxValue < 2) throw new Error('maxValue deve ser >= 2.');
  if (options.optionCount < 2 || options.optionCount > 4) throw new Error('optionCount deve ficar entre 2 e 4.');
  if (options.images.length === 0) throw new Error('Informe ao menos uma imagem.');

  const random = createRandom(options.seed);
  const sorted = [...entries].sort((a, b) => a.time - b.time);
  const idWidth = Math.max(2, String(sorted.length).length);

  return sorted.map((entry, index) => {
    const showAt = roundTime(entry.time - options.leadSec);
    const closeAt = roundTime(entry.time + options.afterSec);
    if (showAt < 0) throw new Error(`Timestamp ${entry.time}s é cedo demais para um lead de ${options.leadSec}s.`);

    const previous = sorted[index - 1];
    if (previous && showAt < roundTime(previous.time + options.afterSec)) {
      throw new Error(`Timestamps ${previous.time}s e ${entry.time}s estão próximos demais: as janelas se sobrepõem.`);
    }

    const type = entry.type ?? options.defaultType;
    const skill = entry.skill ?? DEFAULT_SKILL[type];
    const prompt = buildPrompt(type, skill, options, random);
    const answer = expectedAnswer(prompt);

    return {
      id: `${options.idPrefix}${String(index + 1).padStart(idWidth, '0')}`,
      skill,
      showAt,
      targetAt: roundTime(entry.time),
      closeAt,
      prompt,
      options: buildChoices(prompt, options.optionCount, random),
      answer,
    };
  });
}

/** Lê linhas `<segundos> [tipo] [skill]`; ignora linhas vazias e comentários com #. */
export function parseTimestamps(text: string): TimestampEntry[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/#.*$/, '').trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const [rawTime, rawType, skill] = line.split(/[\s,;]+/);
      const time = Number(rawTime);
      if (!Number.isFinite(time) || time < 0) throw new Error(`Timestamp inválido: "${line}"`);
      const isKnownType = rawType === undefined || PROMPT_TYPES.some((type) => type === rawType);
      if (!isKnownType) throw new Error(`Tipo desconhecido: "${rawType}"`);
      return { time, type: rawType as PromptType | undefined, skill };
    });
}
