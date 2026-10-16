import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import {
  DEFAULT_SETTINGS,
  PROGRESS_EXPORT_FORMAT,
  PROGRESS_EXPORT_VERSION,
  type Attempt,
  type ChapterResult,
  type ProgressExport,
  type ProgressRepository,
  settingsSchema,
  type Settings,
} from './types';

const DB_NAME = 'playkids-progress';
const DB_VERSION = 1;
const SETTINGS_KEY = 'settings';

interface ProgressDb extends DBSchema {
  attempts: { key: number; value: Attempt; indexes: { skill: string } };
  chapterResults: { key: string; value: ChapterResult };
  settings: { key: string; value: Settings };
}

export function createIdbProgressRepository(dbName: string = DB_NAME): ProgressRepository {
  let dbPromise: Promise<IDBPDatabase<ProgressDb>> | null = null;

  const db = () => {
    dbPromise ??= openDB<ProgressDb>(dbName, DB_VERSION, {
      upgrade(database) {
        database.createObjectStore('attempts', { autoIncrement: true }).createIndex('skill', 'skill');
        database.createObjectStore('chapterResults', { keyPath: 'chapterId' });
        database.createObjectStore('settings');
      },
    });
    return dbPromise;
  };

  /** Passa pelo schema para completar campos que não existiam quando a configuração foi salva. */
  const getSettings = async (): Promise<Settings> => {
    const stored = await (await db()).get('settings', SETTINGS_KEY);
    if (!stored) return DEFAULT_SETTINGS;
    const parsed = settingsSchema.safeParse(stored);
    return parsed.success ? parsed.data : DEFAULT_SETTINGS;
  };

  return {
    async recordAttempt(attempt) {
      await (await db()).add('attempts', attempt);
    },

    async listAttempts() {
      return (await db()).getAll('attempts');
    },

    async saveChapterResult(result) {
      await (await db()).put('chapterResults', result);
    },

    async listChapterResults() {
      return (await db()).getAll('chapterResults');
    },

    getSettings,

    async saveSettings(settings) {
      await (await db()).put('settings', settings, SETTINGS_KEY);
    },

    async exportAll(): Promise<ProgressExport> {
      const database = await db();
      const [attempts, chapterResults, settings] = await Promise.all([
        database.getAll('attempts'),
        database.getAll('chapterResults'),
        getSettings(),
      ]);
      return {
        format: PROGRESS_EXPORT_FORMAT,
        version: PROGRESS_EXPORT_VERSION,
        exportedAt: new Date().toISOString(),
        attempts,
        chapterResults,
        settings,
      };
    },

    async importAll(data) {
      // Uma transação só: ou importa tudo, ou o progresso anterior fica intacto.
      const tx = (await db()).transaction(['attempts', 'chapterResults', 'settings'], 'readwrite');
      const attempts = tx.objectStore('attempts');
      const chapterResults = tx.objectStore('chapterResults');
      const settings = tx.objectStore('settings');
      await Promise.all([
        attempts.clear(),
        chapterResults.clear(),
        ...data.attempts.map((attempt) => attempts.add(attempt)),
        ...data.chapterResults.map((result) => chapterResults.put(result)),
        settings.put(data.settings, SETTINGS_KEY),
        tx.done,
      ]);
    },

    async clear() {
      const tx = (await db()).transaction(['attempts', 'chapterResults', 'settings'], 'readwrite');
      await Promise.all([
        tx.objectStore('attempts').clear(),
        tx.objectStore('chapterResults').clear(),
        tx.objectStore('settings').clear(),
        tx.done,
      ]);
    },
  };
}
