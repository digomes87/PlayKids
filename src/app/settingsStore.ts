import { create } from 'zustand';
import { DEFAULT_NUMBER_VOICE, type NumberVoice } from '../audio/numberVoices';
import { progressRepository, type Settings } from '../progress';

interface SettingsState {
  readonly isLoaded: boolean;
  readonly latencyOffsetMs: number | null;
  readonly numberVoice: NumberVoice;
  /** Só em memória: o portão dos pais fecha de novo ao recarregar o app. */
  readonly isParentUnlocked: boolean;
  load(): Promise<void>;
  saveLatencyOffset(latencyOffsetMs: number | null): Promise<void>;
  saveNumberVoice(numberVoice: NumberVoice): Promise<void>;
  unlockParents(): void;
}

export const useSettingsStore = create<SettingsState>((set, get) => {
  /**
   * Salva a configuração inteira (cada campo preserva os outros). A tela muda na
   * hora; se o aparelho não conseguir gravar, volta ao valor anterior.
   */
  const save = async (patch: Partial<Settings>) => {
    const { latencyOffsetMs, numberVoice } = get();
    const previous: Settings = { latencyOffsetMs, numberVoice };
    const next: Settings = { ...previous, ...patch };
    set(next);
    try {
      await progressRepository.saveSettings(next);
    } catch (error) {
      set(previous);
      throw error;
    }
  };

  return {
    isLoaded: false,
    latencyOffsetMs: null,
    numberVoice: DEFAULT_NUMBER_VOICE,
    isParentUnlocked: false,

    async load() {
      try {
        const settings = await progressRepository.getSettings();
        set({ isLoaded: true, ...settings });
      } catch (error) {
        // Sem IndexedDB (ex.: navegação privada) o jogo ainda roda, só não lembra as configurações.
        console.error('Não foi possível ler as configurações.', error);
        set({ isLoaded: true });
      }
    },

    saveLatencyOffset: (latencyOffsetMs) => save({ latencyOffsetMs }),

    saveNumberVoice: (numberVoice) => save({ numberVoice }),

    unlockParents() {
      set({ isParentUnlocked: true });
    },
  };
});
