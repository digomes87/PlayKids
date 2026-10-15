/**
 * Gera o áudio placeholder (livre de direitos, sintetizado aqui mesmo):
 *   - public/content/audio/chapter-01.wav: metrônomo + melodia pentatônica, 90 BPM
 *   - public/content/audio/chapter-02.wav: metrônomo + melodia pentatônica em Ré, 100 BPM
 *   - public/content/audio/chapter-03.wav: metrônomo + melodia pentatônica em Sol, 110 BPM
 *   - public/content/audio/chapter-04.wav: metrônomo + melodia pentatônica em Fá, 120 BPM
 *   - public/content/audio/click-90.wav:   só os cliques, para a calibração
 * Troque por música de verdade mantendo o BPM/timestamps do capítulo.
 */
import { mkdirSync, writeFileSync } from 'node:fs';

const SAMPLE_RATE = 16000;
const BEATS_PER_BAR = 4;
const OUT_DIR = new URL('../public/content/audio/', import.meta.url);

// Dó maior pentatônica (C4 D4 E4 G4 A4 C5) e um baixo simples.
const STARS_SONG = {
  melodyHz: [261.63, 329.63, 392.0, 440.0, 392.0, 329.63, 293.66, 261.63, 329.63, 392.0, 523.25, 440.0, 392.0, 329.63, 293.66, 392.0],
  bassHz: [130.81, 130.81, 174.61, 196.0],
};
// Ré maior pentatônica (D4 E4 F#4 A4 B4 D5), em ondas que sobem e descem.
const SEA_SONG = {
  melodyHz: [293.66, 369.99, 440.0, 493.88, 587.33, 493.88, 440.0, 369.99, 329.63, 369.99, 440.0, 369.99, 293.66, 329.63, 440.0, 293.66],
  bassHz: [146.83, 196.0, 220.0, 146.83],
};
// Sol maior pentatônica (G4 A4 B4 D5 E5 G5), saltitante como passos na floresta.
const FOREST_SONG = {
  melodyHz: [392.0, 493.88, 587.33, 493.88, 440.0, 392.0, 440.0, 493.88, 587.33, 659.25, 783.99, 659.25, 587.33, 493.88, 440.0, 392.0],
  bassHz: [196.0, 146.83, 164.81, 146.83],
};
// Fá maior pentatônica (F4 G4 A4 C5 D5 F5), como uma cantiga de roda.
const FARM_SONG = {
  melodyHz: [349.23, 440.0, 523.25, 440.0, 392.0, 349.23, 392.0, 440.0, 523.25, 587.33, 698.46, 587.33, 523.25, 440.0, 392.0, 349.23],
  bassHz: [174.61, 116.54, 130.81, 174.61],
};

function addTone(samples, startSec, durationSec, frequency, gain, decay) {
  const start = Math.floor(startSec * SAMPLE_RATE);
  const length = Math.floor(durationSec * SAMPLE_RATE);
  for (let i = 0; i < length && start + i < samples.length; i += 1) {
    const t = i / SAMPLE_RATE;
    const attack = Math.min(1, t / 0.005);
    samples[start + i] += Math.sin(2 * Math.PI * frequency * t) * Math.exp(-t * decay) * attack * gain;
  }
}

function render(durationSec, bpm, song) {
  const beatSec = 60 / bpm;
  const samples = new Float64Array(Math.floor(durationSec * SAMPLE_RATE));
  const beats = Math.floor(durationSec / beatSec);
  for (let beat = 0; beat < beats; beat += 1) {
    const time = beat * beatSec;
    const isDownbeat = beat % BEATS_PER_BAR === 0;
    addTone(samples, time, 0.06, isDownbeat ? 1760 : 1320, isDownbeat ? 0.5 : 0.35, 60);
    if (!song) continue;
    addTone(samples, time, beatSec * 0.95, song.melodyHz[beat % song.melodyHz.length], 0.22, 4);
    if (isDownbeat) {
      const bar = Math.floor(beat / BEATS_PER_BAR);
      addTone(samples, time, beatSec * BEATS_PER_BAR, song.bassHz[bar % song.bassHz.length], 0.25, 1.2);
    }
  }
  return samples;
}

function toWav(samples) {
  const dataBytes = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataBytes);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataBytes, 4);
  buffer.write('WAVEfmt ', 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataBytes, 40);
  samples.forEach((sample, index) => {
    const clipped = Math.max(-1, Math.min(1, sample));
    buffer.writeInt16LE(Math.round(clipped * 32767), 44 + index * 2);
  });
  return buffer;
}

mkdirSync(OUT_DIR, { recursive: true });
const tracks = [
  { file: 'chapter-01.wav', durationSec: 48, bpm: 90, song: STARS_SONG },
  { file: 'chapter-02.wav', durationSec: 60, bpm: 100, song: SEA_SONG },
  { file: 'chapter-03.wav', durationSec: 62, bpm: 110, song: FOREST_SONG },
  { file: 'chapter-04.wav', durationSec: 64, bpm: 120, song: FARM_SONG },
  { file: 'click-90.wav', durationSec: 24, bpm: 90, song: null },
];
tracks.forEach(({ file, durationSec, bpm, song }) => {
  const wav = toWav(render(durationSec, bpm, song));
  writeFileSync(new URL(file, OUT_DIR), wav);
  console.log(`${file}: ${durationSec}s, ${bpm} BPM, ${(wav.length / 1024).toFixed(0)} KB`);
});
