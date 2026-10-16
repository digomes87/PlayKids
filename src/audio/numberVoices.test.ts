import { existsSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { RECORDED_VOICES, numberClipPath, recordedNumberPath } from './numberVoices';

describe('vozes gravadas dos números', () => {
  test('aponta para a gravação da voz escolhida', () => {
    expect(recordedNumberPath('luciana', 5)).toBe('voices/luciana/5.m4a');
    expect(recordedNumberPath('reed', 0)).toBe('voices/reed/0.m4a');
  });

  test('sem gravação para a voz do aparelho nem para números fora de 0 a 10', () => {
    expect(recordedNumberPath('device', 5)).toBeNull();
    expect(recordedNumberPath('luciana', 11)).toBeNull();
    expect(recordedNumberPath('luciana', -1)).toBeNull();
  });

  test('a gravação do próprio capítulo tem prioridade sobre a voz escolhida', () => {
    expect(numberClipPath({ value: 3, audio: 'audio/tres.m4a' }, 'flo')).toBe('audio/tres.m4a');
    expect(numberClipPath({ value: 3 }, 'flo')).toBe('voices/flo/3.m4a');
    expect(numberClipPath({ value: 3 }, 'device')).toBeNull();
  });

  test('toda voz gravada tem os 11 arquivos publicados', () => {
    RECORDED_VOICES.forEach((voice) => {
      Array.from({ length: 11 }, (_, value) => {
        const path = recordedNumberPath(voice, value);
        expect(existsSync(new URL(`../../public/content/${path}`, import.meta.url))).toBe(true);
      });
    });
  });
});
