
import { AIProfile, UserMemory } from './types';

export const GEMINI_MODELS = [
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash (Fast)' },
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro (Smart)' },
  { id: 'gemini-2.5-flash-lite-latest', name: 'Flash Lite' }
];

export const DEFAULT_MEMORY: UserMemory = {
  identity: '',
  personality: '',
  behavior: '',
  notes: '',
  summary: ''
};

export const DEFAULT_PROFILES: AIProfile[] = [
  {
    id: 'default-assistant',
    name: 'Vivica Primary',
    systemPrompt: 'You are Vivica, a clever and articulate AI assistant.',
    model: 'gemini-3-flash-preview',
    temperature: 0.7,
    memory: { ...DEFAULT_MEMORY },
    isDefault: true
  }
];

export const STORAGE_KEYS = {
  CONVERSATIONS: 'vivica_conversations_v2',
  PROFILES: 'vivica_profiles_v2',
  SETTINGS: 'vivica_settings_v2',
  // Added missing MEMORY key
  MEMORY: 'vivica_memory_v2'
};
