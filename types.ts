
export enum Role {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system'
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  profileId?: string;
  isError?: boolean;
}

export interface AIProfile {
  id: string;
  name: string;
  systemPrompt: string;
  model: string;
  temperature: number;
  memory: UserMemory;
  isDefault?: boolean;
}

export interface UserMemory {
  identity: string;
  personality: string;
  behavior: string;
  notes: string;
  summary?: string;
}

export interface Conversation {
  id: string;
  title: string;
  lastUpdated: number;
  messages: Message[];
  profileId: string;
  isMemoryEnabled: boolean; // New: Toggle memory per chat session
}

export interface Settings {
  openRouterApiKey: string;
  activeConversationId: string | null;
  activeProfileId: string;
  themeFamily: 'amoled' | 'blue' | 'red';
  isDarkMode: boolean;
}
