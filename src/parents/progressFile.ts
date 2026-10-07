import { z } from 'zod';
import { progressExportSchema, type ProgressExport } from '../progress';

const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export function downloadProgress(data: ProgressExport): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `playkids-progresso-${data.exportedAt.slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
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
