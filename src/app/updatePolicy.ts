const PLAY_ROUTE_PREFIX = '/play/';

/** Recarregar no meio da partida cortaria a música e perderia o placar. Recebe a rota do app. */
export function isMidGame(path: string): boolean {
  return path.startsWith(PLAY_ROUTE_PREFIX);
}
