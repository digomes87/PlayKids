import { describe, expect, test, vi } from 'vitest';
import { buildShareData, shareResult } from './share';

const summary = { total: 10, hits: 7, misses: 2, timeouts: 1, accuracy: 0.7 };
const data = buildShareData('A Festa das Estrelas', summary, 2, 'https://example.test/PlayKids/');

describe('compartilhar resultado', () => {
  test('monta o texto com estrelas, placar e capítulo', () => {
    expect(data.text).toBe(
      '⭐⭐ 7 de 10 em "A Festa das Estrelas" no PlayKids, o jogo de matemática no ritmo da música!',
    );
    expect(data.url).toBe('https://example.test/PlayKids/');
  });

  test('usa a folha de compartilhamento nativa quando existe', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const copy = vi.fn();
    expect(await shareResult(data, { share, copy })).toBe('shared');
    expect(share).toHaveBeenCalledWith(data);
    expect(copy).not.toHaveBeenCalled();
  });

  test('fechar a folha de compartilhamento conta como cancelado, não como erro', async () => {
    const share = vi.fn().mockRejectedValue(new DOMException('fechado', 'AbortError'));
    expect(await shareResult(data, { share })).toBe('cancelled');
  });

  test('propaga falhas reais de compartilhamento', async () => {
    const share = vi.fn().mockRejectedValue(new Error('falhou'));
    await expect(shareResult(data, { share })).rejects.toThrow('falhou');
  });

  test('sem Web Share, copia texto e link', async () => {
    const copy = vi.fn().mockResolvedValue(undefined);
    expect(await shareResult(data, { copy })).toBe('copied');
    expect(copy).toHaveBeenCalledWith(`${data.text} ${data.url}`);
  });

  test('sem nenhum dos dois, avisa que não há suporte', async () => {
    expect(await shareResult(data, {})).toBe('unsupported');
  });
});
