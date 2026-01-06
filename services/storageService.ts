
// Removed non-existent AppState import
import { Conversation, AIProfile, UserMemory } from '../types';
import { STORAGE_KEYS, DEFAULT_PROFILES, DEFAULT_MEMORY } from '../constants';

export const storageService = {
  saveConversations: (conversations: Conversation[]) => {
    localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(conversations));
  },
  loadConversations: (): Conversation[] => {
    const data = localStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
    return data ? JSON.parse(data) : [];
  },
  saveProfiles: (profiles: AIProfile[]) => {
    localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
  },
  loadProfiles: (): AIProfile[] => {
    const data = localStorage.getItem(STORAGE_KEYS.PROFILES);
    return data ? JSON.parse(data) : DEFAULT_PROFILES;
  },
  saveMemory: (memory: UserMemory) => {
    localStorage.setItem(STORAGE_KEYS.MEMORY, JSON.stringify(memory));
  },
  loadMemory: (): UserMemory => {
    const data = localStorage.getItem(STORAGE_KEYS.MEMORY);
    return data ? JSON.parse(data) : DEFAULT_MEMORY;
  },
  saveSettings: (settings: { activeConversationId: string | null; activeProfileId: string; theme: string }) => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  },
  loadSettings: () => {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return data ? JSON.parse(data) : { activeConversationId: null, activeProfileId: DEFAULT_PROFILES[0].id, theme: 'dark' };
  }
};
