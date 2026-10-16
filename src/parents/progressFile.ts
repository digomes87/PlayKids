import { z } from 'zod';
import { downloadJson } from '../app/downloadJson';
import { progressExportSchema, type ProgressExport } from '../progress';

const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export function downloadProgress(data: ProgressExport): void {
  downloadJson(data, `playkids-progresso-${data.exportedAt.slice(0, 10)}.json`);
}

/** Lê e valida um arquivo de progresso; lança Error com mensagem para o usuário. */
export async function readProgressFile(file: File): Promise<ProgressExport> {
  if (file.size > MAX_IMPORT_BYTES) throw new Error('Arquivo grande demais para ser um progresso do PlayKids.');

  let raw: unknown;
  try {
    raw = JSON.parse(await file.text());
  } catch {
    throw new Error('O arquivo não é um JSON válido.');
  }

  const parsed = progressExportSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Este arquivo não é um progresso do PlayKids:\n${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}
