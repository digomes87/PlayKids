/**
 * Grava os números de 0 a 10 em cada voz para os desafios number_audio:
 *   public/content/voices/<voz>/<n>.m4a
 * Usa as vozes pt-BR do macOS (`say`) e o ffmpeg: corta o silêncio, iguala o
 * volume e salva em AAC mono. Só roda no macOS; os arquivos gerados vão no repo.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const OUT_DIR = new URL('../public/content/voices/', import.meta.url).pathname;

/** id usado no app -> nome da voz no macOS. Mantenha em sincronia com src/audio/numberVoices.ts. */
const VOICES = {
  luciana: 'Luciana (Premium)',
  flo: 'Flo',
  reed: 'Reed',
};

const NUMBER_WORDS = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez'];

// Corta silêncio no começo e no fim, normaliza a altura percebida e evita estalos.
const AUDIO_FILTER = [
  'silenceremove=start_periods=1:start_threshold=-45dB',
  'areverse',
  'silenceremove=start_periods=1:start_threshold=-45dB',
  'areverse',
  'loudnorm=I=-16:TP=-1.5:LRA=7',
  'afade=t=in:d=0.01',
].join(',');

function record(voiceName, word, outFile, workDir) {
  const raw = join(workDir, 'raw.aiff');
  execFileSync('say', ['-v', voiceName, '-o', raw, word]);
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', raw, '-af', AUDIO_FILTER, '-ac', '1', '-ar', '44100', '-c:a', 'aac', '-b:a', '64k', outFile]);
}

const workDir = mkdtempSync(join(tmpdir(), 'playkids-voices-'));
try {
  Object.entries(VOICES).forEach(([id, voiceName]) => {
    const voiceDir = join(OUT_DIR, id);
    mkdirSync(voiceDir, { recursive: true });
    NUMBER_WORDS.forEach((word, value) => record(voiceName, word, join(voiceDir, `${value}.m4a`), workDir));
    console.log(`${id} (${voiceName}): ${NUMBER_WORDS.length} gravações`);
  });
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
