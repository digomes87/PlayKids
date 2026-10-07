import { create } from 'zustand';
import { progressRepository } from '../progress';

interface SettingsState {
  readonly isLoaded: boolean;
  readonly latencyOffsetMs: number | null;
  /** Só em memória: o portão dos pais fecha de novo ao recarregar o app. */
  readonly isParentUnlocked: boolean;
  load(): Promise<void>;
  saveLatencyOffset(latencyOffsetMs: number | null): Promise<void>;
  unlockParents(): void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  isLoaded: false,
  latencyOffsetMs: null,
  isParentUnlocked: false,

  async load() {
    try {
      const settings = await progressRepository.getSettings();
      set({ isLoaded: true, latencyOffsetMs: settings.latencyOffsetMs });
    } catch (error) {
      // Sem IndexedDB (ex.: navegação privada) o jogo ainda roda, só não lembra a calibração.
      console.error('Não foi possível ler as configurações.', error);
      set({ isLoaded: true });
    }
  },

  async saveLatencyOffset(latencyOffsetMs) {
    await progressRepository.saveSettings({ latencyOffsetMs });
    set({ latencyOffsetMs });
  },

  unlockParents() {
    set({ isParentUnlocked: true });
  },
}));
