/**
 * Gera o áudio placeholder (livre de direitos, sintetizado aqui mesmo):
 *   - public/content/audio/chapter-01.wav: metrônomo + melodia pentatônica, 90 BPM
 *   - public/content/audio/click-90.wav:   só os cliques, para a calibração
 * Troque por música de verdade mantendo o BPM/timestamps do capítulo.
 */
import { mkdirSync, writeFileSync } from 'node:fs';

const SAMPLE_RATE = 16000;
const BPM = 90;
const BEAT_SEC = 60 / BPM;
const BEATS_PER_BAR = 4;
const OUT_DIR = new URL('../public/content/audio/', import.meta.url);

// Dó maior pentatônica (C4 D4 E4 G4 A4 C5) e um baixo simples.
const MELODY_HZ = [261.63, 329.63, 392.0, 440.0, 392.0, 329.63, 293.66, 261.63, 329.63, 392.0, 523.25, 440.0, 392.0, 329.63, 293.66, 392.0];
const BASS_HZ = [130.81, 130.81, 174.61, 196.0];

function addTone(samples, startSec, durationSec, frequency, gain, decay) {
  const start = Math.floor(startSec * SAMPLE_RATE);
  const length = Math.floor(durationSec * SAMPLE_RATE);
  for (let i = 0; i < length && start + i < samples.length; i += 1) {
    const t = i / SAMPLE_RATE;
    const attack = Math.min(1, t / 0.005);
    samples[start + i] += Math.sin(2 * Math.PI * frequency * t) * Math.exp(-t * decay) * attack * gain;
  }
}

function render(durationSec, { melody }) {
  const samples = new Float64Array(Math.floor(durationSec * SAMPLE_RATE));
  const beats = Math.floor(durationSec / BEAT_SEC);
  for (let beat = 0; beat < beats; beat += 1) {
    const time = beat * BEAT_SEC;
    const isDownbeat = beat % BEATS_PER_BAR === 0;
    addTone(samples, time, 0.06, isDownbeat ? 1760 : 1320, isDownbeat ? 0.5 : 0.35, 60);
    if (!melody) continue;
    addTone(samples, time, BEAT_SEC * 0.95, MELODY_HZ[beat % MELODY_HZ.length], 0.22, 4);
    if (isDownbeat) {
      const bar = Math.floor(beat / BEATS_PER_BAR);
      addTone(samples, time, BEAT_SEC * BEATS_PER_BAR, BASS_HZ[bar % BASS_HZ.length], 0.25, 1.2);
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
  { file: 'chapter-01.wav', durationSec: 48, melody: true },
  { file: 'click-90.wav', durationSec: 24, melody: false },
];
tracks.forEach(({ file, durationSec, melody }) => {
  const wav = toWav(render(durationSec, { melody }));
  writeFileSync(new URL(file, OUT_DIR), wav);
  console.log(`${file}: ${durationSec}s, ${(wav.length / 1024).toFixed(0)} KB`);
});
