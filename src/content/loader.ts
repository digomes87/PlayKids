import { z } from 'zod';
import { contentUrl } from './paths';
import { chapterSchema, contentIndexSchema, type Chapter, type ContentIndex } from './schema';

export class ContentError extends Error {}

async function fetchJson(path: string): Promise<unknown> {
  const url = contentUrl(path);
  let response: Response;
  try {
    response = await fetch(url);
  } catch (cause) {
    throw new ContentError(`Sem conexão ao carregar ${path}.`, { cause });
  }
  if (!response.ok) throw new ContentError(`Não foi possível carregar ${path} (HTTP ${response.status}).`);
  try {
    return await response.json();
  } catch (cause) {
    throw new ContentError(`${path} não é um JSON válido.`, { cause });
  }
}

function parse<T>(schema: z.ZodType<T>, data: unknown, path: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ContentError(`Conteúdo inválido em ${path}:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

export async function loadContentIndex(): Promise<ContentIndex> {
  const path = 'index.json';
  return parse(contentIndexSchema, await fetchJson(path), path);
}

export async function loadChapter(chapterId: string): Promise<Chapter> {
  const index = await loadContentIndex();
  const entry = index.chapters.find((chapter) => chapter.id === chapterId);
  if (!entry) throw new ContentError(`Capítulo "${chapterId}" não existe.`);
  const chapter = parse(chapterSchema, await fetchJson(entry.file), entry.file);
  if (chapter.id !== entry.id) {
    throw new ContentError(`${entry.file} tem id "${chapter.id}", mas o índice espera "${entry.id}".`);
  }
  return chapter;
}
