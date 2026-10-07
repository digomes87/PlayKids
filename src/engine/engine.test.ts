import { describe, expect, test } from 'vitest';
import { GameEngine } from './engine';
import { FakeAudioPlayer, makeChallenges } from './testing';
import type { EngineEvent } from './types';

async function setup(count = 3, latencyOffsetSec = 0) {
  const player = new FakeAudioPlayer();
  const engine = new GameEngine({ player, challenges: makeChallenges(count), latencyOffsetSec });
  const events: EngineEvent[] = [];
  engine.subscribe((event) => events.push(event));
  await engine.start();
  const advanceTo = (time: number) => {
    player.time = time;
    engine.tick();
  };
  const ofType = <T extends EngineEvent['type']>(type: T) =>
    events.filter((event): event is Extract<EngineEvent, { type: T }> => event.type === type);
  return { player, engine, events, advanceTo, ofType };
}

describe('GameEngine', () => {
  test('start toca o áudio na velocidade inicial', async () => {
    const { player, engine } = await setup();
    expect(player.playing).toBe(true);
    expect(player.rate).toBe(0.9);
    expect(engine.getStatus()).toBe('running');
  });

  test('abre o desafio quando o tempo da mídia chega em showAt', async () => {
    const { engine, advanceTo, ofType } = await setup();
    advanceTo(9.9);
    expect(engine.getActiveChallenge()).toBeNull();
    advanceTo(10);
    expect(engine.getActiveChallenge()?.id).toBe('c1');
    expect(ofType('challenge_opened')).toHaveLength(1);
  });

  test('resposta certa dentro da janela é acerto', async () => {
    const { engine, advanceTo, ofType } = await setup();
    advanceTo(11.8);
    expect(engine.answer(3)).toBe(true);
    const [resolved] = ofType('challenge_resolved');
    expect(resolved.result.outcome).toBe('hit');
    expect(resolved.result.selected).toBe(3);
    expect(resolved.result.timingErrorSec).toBeCloseTo(-0.2);
    expect(engine.getActiveChallenge()).toBeNull();
  });

  test('resposta errada é erro', async () => {
    const { engine, advanceTo, ofType } = await setup();
    advanceTo(11);
    engine.answer(4);
    expect(ofType('challenge_resolved')[0].result.outcome).toBe('miss');
  });

  test('ignora resposta sem desafio aberto e segunda resposta ao mesmo desafio', async () => {
    const { engine, advanceTo, ofType } = await setup();
    advanceTo(5);
    expect(engine.answer(3)).toBe(false);
    advanceTo(11);
    engine.answer(4);
    expect(engine.answer(3)).toBe(false);
    expect(ofType('challenge_resolved')).toHaveLength(1);
  });

  test('desafio sem resposta vira timeout quando a janela fecha', async () => {
    const { advanceTo, ofType } = await setup();
    advanceTo(12.9);
    expect(ofType('challenge_resolved')).toHaveLength(0);
    advanceTo(13);
    const [resolved] = ofType('challenge_resolved');
    expect(resolved.result.outcome).toBe('timeout');
    expect(resolved.result.selected).toBeNull();
    expect(resolved.result.reactionSec).toBeNull();
  });

  test('tempo de reação é medido em tempo real, não de mídia', async () => {
    const { engine, advanceTo, ofType } = await setup();
    advanceTo(11.8);
    engine.answer(3);
    // 1.8 s de mídia a 0.9x = 2 s de relógio.
    expect(ofType('challenge_resolved')[0].result.reactionSec).toBeCloseTo(2);
  });

  test('compensa a latência calibrada na resposta e no fechamento da janela', async () => {
    const { engine, advanceTo, ofType } = await setup(3, 0.2);
    // 0.2 s reais a 0.9x = 0.18 s de mídia.
    advanceTo(13.1);
    expect(ofType('challenge_resolved')).toHaveLength(0);
    engine.answer(3);
    expect(ofType('challenge_resolved')[0].result.timingErrorSec).toBeCloseTo(13.1 - 0.18 - 12);
  });

  test('dois erros seguidos reduzem o playbackRate do player', async () => {
    const { player, engine, advanceTo, ofType } = await setup();
    advanceTo(11);
    engine.answer(4);
    advanceTo(23);
    expect(player.rate).toBe(0.75);
    expect(ofType('tempo_changed')).toEqual([{ type: 'tempo_changed', from: 0.9, to: 0.75 }]);
  });

  test('cinco acertos seguidos sobem o playbackRate', async () => {
    const { player, engine, advanceTo } = await setup(6);
    for (let index = 1; index <= 5; index += 1) {
      advanceTo(10 * index + 1);
      engine.answer(3);
    }
    expect(player.rate).toBe(1.0);
    expect(player.rateHistory).toEqual([0.9, 1.0]);
  });

  test('salto no tempo resolve como timeout todos os desafios pulados', async () => {
    const { advanceTo, ofType, engine } = await setup(3);
    advanceTo(31);
    expect(ofType('challenge_resolved').map((event) => event.result.outcome)).toEqual(['timeout', 'timeout']);
    expect(engine.getActiveChallenge()?.id).toBe('c3');
  });

  test('termina depois do último desafio e emite o resumo', async () => {
    const { player, engine, advanceTo, ofType } = await setup(3);
    advanceTo(11);
    engine.answer(3);
    advanceTo(21);
    engine.answer(2);
    advanceTo(33);
    expect(engine.getStatus()).toBe('finished');
    expect(player.playing).toBe(false);
    expect(ofType('finished')[0].summary).toEqual({
      total: 3,
      hits: 1,
      misses: 1,
      timeouts: 1,
      accuracy: 1 / 3,
    });
  });

  test('termina se o áudio acabar antes do fim da agenda', async () => {
    const { player, engine, advanceTo, ofType } = await setup(3);
    player.ended = true;
    advanceTo(15);
    expect(engine.getStatus()).toBe('finished');
    expect(ofType('finished')[0].summary.timeouts).toBe(3);
  });

  test('pausado não abre nem fecha desafios', async () => {
    const { player, engine, advanceTo, ofType } = await setup();
    engine.pause();
    expect(player.playing).toBe(false);
    advanceTo(13);
    expect(ofType('challenge_opened')).toHaveLength(0);
    await engine.resume();
    engine.tick();
    expect(ofType('challenge_opened')).toHaveLength(1);
  });

  test('getActiveProgress acompanha a janela do desafio', async () => {
    const { engine, advanceTo } = await setup();
    expect(engine.getActiveProgress()).toBeNull();
    advanceTo(11.5);
    expect(engine.getActiveProgress()).toBeCloseTo(0.5);
  });

  test('rejeita agenda com desafios sobrepostos ou resposta fora das opções', () => {
    const player = new FakeAudioPlayer();
    const [first, second] = makeChallenges(2);
    expect(() => new GameEngine({ player, challenges: [first, { ...second, showAt: 12, targetAt: 14, closeAt: 15 }] })).toThrow(
      /antes de/,
    );
    expect(() => new GameEngine({ player, challenges: [{ ...first, answer: 9 }] })).toThrow(/opções/);
  });

  test('não inicia duas vezes', async () => {
    const { engine } = await setup();
    await expect(engine.start()).rejects.toThrow();
  });
});
