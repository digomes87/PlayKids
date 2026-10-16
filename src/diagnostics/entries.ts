export type DiagnosticDetail = Readonly<Record<string, string | number | boolean | null>>;

export interface DiagnosticEntry {
  readonly at: string;
  readonly event: string;
  readonly detail?: DiagnosticDetail;
}

/** Lista circular: guarda só as `max` entradas mais recentes. */
export function appendEntry(
  entries: readonly DiagnosticEntry[],
  entry: DiagnosticEntry,
  max: number,
): readonly DiagnosticEntry[] {
  return [...entries.slice(Math.max(0, entries.length - max + 1)), entry];
}
