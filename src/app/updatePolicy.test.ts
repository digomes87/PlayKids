import { describe, expect, test } from 'vitest';
import { isMidGame } from './updatePolicy';

describe('política de atualização do app', () => {
  test.each(['/play/chapter-01', '/play/chapter-04'])('adia o recarregamento durante a partida (%s)', (path) => {
    expect(isMidGame(path)).toBe(true);
  });

  test.each(['/', '/parents', '/parents/calibration'])('recarrega na hora fora da partida (%s)', (path) => {
    expect(isMidGame(path)).toBe(false);
  });
});
