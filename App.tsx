
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Conversation, AIProfile, UserMemory, Role, Message, Settings 
} from './types';
import { 
  DEFAULT_PROFILES, STORAGE_KEYS, GEMINI_MODELS, DEFAULT_MEMORY 
} from './constants';
import { geminiService } from './services/geminiService';
import { 
  MenuIcon, PlusIcon, SendIcon, UserIcon, BotIcon, TrashIcon, 
  SettingsIcon, BrainIcon, MoonIcon, SunIcon, XMarkIcon 
} from './components/Icons';
import { marked } from 'marked';

// --- Custom Modern Components ---

// Added MessageBubble component to render messages and handle markdown parsing
const MessageBubble: React.FC<{
  message: Message;
  profile: AIProfile;
  onRetry?: () => void;
}> = ({ message, profile, onRetry }) => {
  const isUser = message.role === Role.USER;
  
  const contentHtml = useMemo(() => {
    try {
      // Synchronously parse markdown to HTML for rendering
      return { __html: marked.parse(message.content) as string };
    } catch (e) {
      return { __html: message.content };
    }
  }, [message.content]);

  return (
    <div className={`flex gap-4 p-4 md:p-6 rounded-[2rem] transition-all group animate-in slide-in-from-bottom-2 duration-300 ${isUser ? 'bg-[var(--bg-active)]/30 ml-auto max-w-[85%] border border-[var(--border)]/50' : 'mr-auto max-w-[95%]'}`}>
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg ${isUser ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] order-last' : 'bg-[var(--bg-tertiary)] border border-[var(--border)] text-[var(--text-muted)]'}`}>
        {isUser ? <UserIcon size={20} /> : <BotIcon size={20} />}
      </div>
      <div className={`flex-1 space-y-2 overflow-hidden ${isUser ? 'text-right' : 'text-left'}`}>
        <div className={`flex items-center gap-2 mb-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
          <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">{isUser ? 'User Identity' : profile.name}</span>
          <span className="text-[10px] text-[var(--text-muted)] opacity-40 font-bold">{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div 
          className={`prose prose-invert prose-sm max-w-none prose-headings:font-black prose-p:leading-relaxed prose-pre:bg-black/50 prose-pre:rounded-xl prose-pre:border prose-pre:border-white/5 ${isUser ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] font-medium'}`}
          dangerouslySetInnerHTML={contentHtml}
        />
        {message.isError && (
          <button 
            onClick={onRetry}
            className="mt-4 px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-xs font-bold hover:bg-red-500/20 transition-all flex items-center gap-2"
          >
            Retry Transmission
          </button>
        )}
      </div>
    </div>
  );
};

const SearchableSelect: React.FC<{
  options: { id: string; name: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}> = ({ options, value, onChange, placeholder = "Search models..." }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => 
    options.filter(o => o.name.toLowerCase().includes(query.toLowerCase())),
    [options, query]
  );

  const selectedOption = useMemo(() => 
    options.find(o => o.id === value),
    [options, value]
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-2xl text-sm transition-all focus:ring-2 focus:ring-[var(--accent-primary)]/20 outline-none text-left"
      >
        <span className="truncate">{selectedOption?.name || "Select Model"}</span>
        <svg className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
      </button>

      {isOpen && (
        <div className="absolute z-[60] w-full mt-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-2 border-b border-[var(--border)]">
            <input
              autoFocus
              className="w-full px-3 py-2 bg-[var(--bg-tertiary)] rounded-xl text-xs outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
              placeholder={placeholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            {filtered.length > 0 ? filtered.map(opt => (
              <button
                key={opt.id}
                onClick={() => { onChange(opt.id); setIsOpen(false); setQuery(''); }}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition-colors mb-0.5 ${value === opt.id ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] font-bold' : 'hover:bg-[var(--bg-hover)]'}`}
              >
                {opt.name}
              </button>
            )) : (
              <div className="px-3 py-4 text-center text-xs text-[var(--text-muted)] italic">No results found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ 
  isOpen, onClose, title, children 
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] w-full max-w-2xl rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
        <div className="px-8 py-6 border-b border-[var(--border)] flex justify-between items-center">
          <h2 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">{title}</h2>
          <button onClick={onClose} className="p-2.5 hover:bg-[var(--bg-hover)] rounded-full transition-all text-[var(--text-muted)] hover:text-white active:scale-90">
            <XMarkIcon size={24} />
          </button>
        </div>
        <div className="p-8 overflow-y-auto scroll-smooth">
          {children}
        </div>
      </div>
    </div>
  );
};

// --- Main Application ---

const App: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [profiles, setProfiles] = useState<AIProfile[]>(DEFAULT_PROFILES);
  const [settings, setSettings] = useState<Settings>({
    openRouterApiKey: '',
    activeConversationId: null,
    activeProfileId: DEFAULT_PROFILES[0].id,
    themeFamily: 'amoled',
    isDarkMode: true
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProfileManagerOpen, setIsProfileManagerOpen] = useState(false);
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);
  const [externalModels, setExternalModels] = useState<{id: string, name: string}[]>([]);
  
  const [inputValue, setInputValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load Data
  useEffect(() => {
    const c = localStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
    const p = localStorage.getItem(STORAGE_KEYS.PROFILES);
    const s = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (c) setConversations(JSON.parse(c));
    if (p) setProfiles(JSON.parse(p));
    if (s) setSettings(prev => ({ ...prev, ...JSON.parse(s) }));
  }, []);

  // Save Data
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(conversations));
    localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    
    document.body.setAttribute('data-theme', `${settings.themeFamily}-${settings.isDarkMode ? 'dark' : 'light'}`);
  }, [conversations, profiles, settings]);

  // Model Fetching (OpenRouter)
  useEffect(() => {
    if (settings.openRouterApiKey) {
      fetch("https://openrouter.ai/api/v1/models")
        .then(res => res.json())
        .then(data => {
          if (data.data) {
            setExternalModels(data.data.map((m: any) => ({ id: m.id, name: m.name })));
          }
        }).catch(err => console.error("OpenRouter fetch error:", err));
    } else {
      setExternalModels([]);
    }
  }, [settings.openRouterApiKey]);

  // Computed Values
  const activeConversation = useMemo(() => 
    conversations.find(c => c.id === settings.activeConversationId), 
    [conversations, settings.activeConversationId]
  );

  const activeProfile = useMemo(() => 
    profiles.find(p => p.id === settings.activeProfileId) || profiles[0], 
    [profiles, settings.activeProfileId]
  );

  const profileConversations = useMemo(() => 
    conversations.filter(c => c.profileId === settings.activeProfileId), 
    [conversations, settings.activeProfileId]
  );

  const allModels = useMemo(() => [...GEMINI_MODELS, ...externalModels], [externalModels]);

  // Actions
  const handleSendMessage = async (retryContent?: string) => {
    const content = retryContent || inputValue;
    if (!content.trim() || isGenerating) return;

    let targetId = settings.activeConversationId;
    if (!targetId) {
      const newId = Date.now().toString();
      const newConvo: Conversation = {
        id: newId,
        title: content.slice(0, 32),
        lastUpdated: Date.now(),
        messages: [],
        profileId: settings.activeProfileId,
        isMemoryEnabled: true
      };
      setConversations([newConvo, ...conversations]);
      setSettings(prev => ({ ...prev, activeConversationId: newId }));
      targetId = newId;
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: Role.USER,
      content,
      timestamp: Date.now(),
      profileId: settings.activeProfileId
    };

    setConversations(prev => prev.map(c => 
      c.id === targetId ? { ...c, messages: [...c.messages, userMsg], lastUpdated: Date.now() } : c
    ));
    setInputValue('');
    setIsGenerating(true);

    try {
      const convo = conversations.find(c => c.id === targetId) || { messages: [], isMemoryEnabled: true };
      const history = [...convo.messages, userMsg];
      const assistantId = (Date.now() + 1).toString();
      
      setConversations(prev => prev.map(c => 
        c.id === targetId ? { ...c, messages: [...c.messages, { id: assistantId, role: Role.ASSISTANT, content: '', timestamp: Date.now(), profileId: settings.activeProfileId }] } : c
      ));

      let responseText = '';
      const stream = geminiService.streamChat(history, activeProfile, !!convo.isMemoryEnabled, settings.openRouterApiKey);
      for await (const chunk of stream) {
        responseText += chunk;
        setConversations(prev => prev.map(c => 
          c.id === targetId ? {
            ...c, 
            messages: c.messages.map(m => m.id === assistantId ? { ...m, content: responseText } : m)
          } : c
        ));
      }
    } catch (err: any) {
      setConversations(prev => prev.map(c => 
        c.id === targetId ? {
          ...c, 
          messages: c.messages.map(m => m.role === Role.ASSISTANT && !m.content ? { ...m, content: `Error: ${err.message}`, isError: true } : m)
        } : c
      ));
    } finally {
      setIsGenerating(false);
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSyncMemory = async () => {
    if (!activeConversation || activeConversation.messages.length < 2) return;
    setIsSummarizing(true);
    try {
      const summary = await geminiService.summarizeConversation(activeConversation.messages, activeProfile);
      setProfiles(prev => prev.map(p => 
        p.id === activeProfile.id ? { ...p, memory: { ...p.memory, summary } } : p
      ));
    } catch (err) {
      console.error("Sync failed:", err);
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden font-inter transition-colors duration-500">
      
      {/* Mobile Sidebar Backdrop */}
      {isSidebarOpen && window.innerWidth <= 768 && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Sidebar - Professional & tactile */}
      <aside className={`
        fixed md:relative z-50 h-full w-[300px] md:w-80 bg-[var(--bg-secondary)] border-r border-[var(--border)]
        transition-all duration-400 ease-[cubic-bezier(0.4,0,0.2,1)] flex flex-col shadow-2xl
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:hidden'}
      `}>
        <div className="p-6 border-b border-[var(--border)] flex items-center justify-between h-[var(--header-height)]">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-[var(--accent-primary)] to-[var(--text-muted)] rounded-2xl flex items-center justify-center text-[var(--bg-primary)] shadow-lg transform rotate-3">
              <BrainIcon size={24} />
            </div>
            <span className="font-extrabold tracking-tighter text-xl">Vivica</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 hover:bg-[var(--bg-hover)] rounded-xl transition-all"><XMarkIcon /></button>
        </div>

        <div className="p-4 px-6">
          <button 
            onClick={() => {
              const id = Date.now().toString();
              setConversations([{ id, title: 'New Conversation', profileId: settings.activeProfileId, lastUpdated: Date.now(), messages: [], isMemoryEnabled: true }, ...conversations]);
              setSettings(prev => ({ ...prev, activeConversationId: id }));
              if (window.innerWidth <= 768) setIsSidebarOpen(false);
            }}
            className="w-full flex items-center justify-center gap-3 py-3.5 bg-[var(--accent-primary)] text-[var(--bg-primary)] rounded-2xl font-bold transition-all active:scale-95 shadow-xl hover:brightness-110 btn-tactile"
          >
            <PlusIcon size={20} /> New Workspace
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 space-y-1.5 py-2">
          {profileConversations.map(convo => (
            <div 
              key={convo.id}
              onClick={() => { setSettings(prev => ({ ...prev, activeConversationId: convo.id })); if (window.innerWidth <= 768) setIsSidebarOpen(false); }}
              className={`group flex items-center gap-4 px-4 py-4 rounded-2xl cursor-pointer transition-all border ${
                settings.activeConversationId === convo.id 
                  ? 'bg-[var(--bg-active)] border-[var(--accent-primary)]/30 shadow-md scale-[1.02]' 
                  : 'hover:bg-[var(--bg-hover)] border-transparent'
              }`}
            >
              <div className="flex-1 truncate">
                <p className={`text-sm font-semibold truncate ${settings.activeConversationId === convo.id ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>{convo.title}</p>
                <p className="text-[10px] text-[var(--text-muted)] mt-1 font-medium">{new Date(convo.lastUpdated).toLocaleDateString()}</p>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); setConversations(conversations.filter(c => c.id !== convo.id)); }}
                className="opacity-0 group-hover:opacity-100 p-2 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
              >
                <TrashIcon size={14} />
              </button>
            </div>
          ))}
        </div>

        <div className="p-6 border-t border-[var(--border)] space-y-2 bg-[var(--bg-tertiary)]/50">
          <button onClick={() => setIsProfileManagerOpen(true)} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-xl transition-all">
            <UserIcon size={20} /> Profiles
          </button>
          <button onClick={() => setIsSettingsOpen(true)} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-xl transition-all">
            <SettingsIcon size={20} /> Settings
          </button>
        </div>
      </aside>

      {/* Main Experience */}
      <main className="flex-1 flex flex-col h-full min-w-0 relative">
        
        {/* Header - Glassy & Modern */}
        <header className="h-[var(--header-height)] border-b border-[var(--border)] bg-[var(--bg-secondary)]/70 backdrop-blur-xl flex items-center justify-between px-6 z-30 shadow-sm">
          <div className="flex items-center gap-4 overflow-hidden">
            {!isSidebarOpen && <button onClick={() => setIsSidebarOpen(true)} className="p-2.5 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] rounded-2xl transition-all"><MenuIcon /></button>}
            <div className="truncate flex flex-col">
              <h1 className="font-extrabold text-lg truncate tracking-tight">{activeConversation?.title || 'System Initialized'}</h1>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest truncate">{activeProfile.name} • {activeProfile.model.split('/').pop()}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              disabled={isSummarizing || !activeConversation} 
              onClick={handleSyncMemory}
              className="hidden sm:flex items-center gap-2.5 px-4 py-2 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] rounded-2xl text-xs font-bold transition-all border border-[var(--border)] active:scale-95 shadow-sm disabled:opacity-40"
            >
              {isSummarizing ? <div className="w-4 h-4 border-2 border-[var(--text-muted)] border-t-white animate-spin rounded-full"/> : <BrainIcon size={16} />}
              Sync Brain
            </button>
            <div className="h-8 w-[1px] bg-[var(--border)] mx-1 hidden sm:block" />
            <select 
              value={settings.activeProfileId}
              onChange={(e) => setSettings(prev => ({ ...prev, activeProfileId: e.target.value, activeConversationId: null }))}
              className="bg-[var(--bg-tertiary)] border border-[var(--border)] text-[10px] md:text-xs font-bold py-2 px-3 rounded-xl outline-none cursor-pointer hover:bg-[var(--bg-hover)] transition-all shadow-sm"
            >
              {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </header>

        {/* Message Interface */}
        <div className="flex-1 overflow-y-auto p-4 md:p-10 pb-40 space-y-4">
          <div className="max-w-4xl mx-auto w-full">
            {!activeConversation ? (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-8 animate-in fade-in zoom-in duration-500">
                <div className="w-24 h-24 bg-gradient-to-tr from-[var(--bg-secondary)] to-[var(--bg-hover)] rounded-[2.5rem] flex items-center justify-center text-[var(--accent-primary)] shadow-2xl border border-[var(--border)]">
                  <BrainIcon size={48} />
                </div>
                <div className="space-y-2">
                  <h2 className="text-4xl font-black tracking-tighter">Ready to expand?</h2>
                  <p className="text-[var(--text-secondary)] font-medium max-w-sm mx-auto">Select a workspace from the sidebar or start a new conversation to begin your journey.</p>
                </div>
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="px-8 py-3.5 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all"
                >
                  Explore Workspaces
                </button>
              </div>
            ) : activeConversation.messages.map(msg => (
              <MessageBubble 
                key={msg.id} 
                message={msg} 
                profile={profiles.find(p => p.id === msg.profileId) || activeProfile}
                onRetry={() => handleSendMessage(msg.content)}
              />
            ))}
            {isGenerating && (
              <div className="flex gap-4 animate-pulse px-4">
                <div className="w-10 h-10 rounded-2xl bg-[var(--bg-tertiary)] flex-shrink-0" />
                <div className="space-y-3 flex-1 mt-2">
                  <div className="h-4 bg-[var(--bg-secondary)] rounded-lg w-3/4" />
                  <div className="h-4 bg-[var(--bg-secondary)] rounded-lg w-1/2" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Tactile Input Block */}
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 bg-gradient-to-t from-[var(--bg-primary)] via-[var(--bg-primary)]/80 to-transparent pointer-events-none">
          <div className="max-w-4xl mx-auto relative pointer-events-auto">
            <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-[2rem] p-2 pr-4 shadow-2xl flex items-end gap-2 transition-all focus-within:ring-4 focus-within:ring-[var(--accent-primary)]/10">
              <textarea
                ref={inputRef}
                rows={1}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }}}
                placeholder={`Brief ${activeProfile.name}...`}
                className="flex-1 bg-transparent border-none rounded-[1.5rem] px-6 py-4 outline-none resize-none max-h-48 min-h-[60px] text-base font-medium placeholder:text-[var(--text-muted)]/40"
              />
              <button 
                onClick={() => handleSendMessage()}
                disabled={!inputValue.trim() || isGenerating}
                className="mb-1.5 p-4 bg-[var(--accent-primary)] text-[var(--bg-primary)] rounded-[1.5rem] shadow-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:grayscale btn-tactile"
              >
                <SendIcon size={24} />
              </button>
            </div>
            <div className="mt-3 text-center">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]/50">Processing via {activeProfile.model}</span>
            </div>
          </div>
        </div>
      </main>

      {/* Profiles Modal */}
      <Modal isOpen={isProfileManagerOpen} onClose={() => setIsProfileManagerOpen(false)} title="Profile Repository">
        <div className="space-y-8">
          <button 
            onClick={() => {
              const p: AIProfile = { id: Date.now().toString(), name: 'New Entity', model: GEMINI_MODELS[0].id, temperature: 0.7, systemPrompt: 'You are an advanced AI.', memory: { ...DEFAULT_MEMORY } };
              setProfiles([...profiles, p]);
            }}
            className="w-full py-5 border-2 border-dashed border-[var(--border)] rounded-[2rem] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent-primary)] transition-all flex flex-col items-center justify-center gap-2 hover:bg-[var(--bg-hover)] group"
          >
            <PlusIcon className="w-8 h-8 group-hover:scale-110 transition-transform" />
            <span className="font-extrabold text-sm uppercase tracking-widest">Create New Profile</span>
          </button>
          
          <div className="space-y-6">
            {profiles.map(p => (
              <div key={p.id} className="p-8 bg-[var(--bg-tertiary)]/50 border border-[var(--border)] rounded-[2.5rem] space-y-6 shadow-xl hover:shadow-2xl transition-all border-l-4 border-l-[var(--accent-primary)]">
                <div className="flex justify-between items-center gap-4">
                  <input 
                    value={p.name} 
                    onChange={(e) => setProfiles(profiles.map(pr => pr.id === p.id ? { ...pr, name: e.target.value } : pr))} 
                    className="flex-1 bg-transparent text-2xl font-black outline-none border-none focus:text-[var(--accent-primary)]" 
                  />
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setIsProfileManagerOpen(false); setSettings(prev => ({ ...prev, activeProfileId: p.id })); setIsMemoryOpen(true); }} className="px-4 py-2 bg-[var(--bg-hover)] rounded-xl text-xs font-bold hover:brightness-125 transition-all">Context</button>
                    {!p.isDefault && <button onClick={() => setProfiles(profiles.filter(pr => pr.id !== p.id))} className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-all"><TrashIcon size={18} /></button>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">Model Registry</label>
                    <SearchableSelect 
                      options={allModels} 
                      value={p.model} 
                      onChange={(val) => setProfiles(profiles.map(pr => pr.id === p.id ? { ...pr, model: val } : pr))} 
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">Entropy ({p.temperature})</label>
                    <input 
                      type="range" min="0" max="1" step="0.1" 
                      value={p.temperature} 
                      onChange={e => setProfiles(profiles.map(pr => pr.id === p.id ? { ...pr, temperature: parseFloat(e.target.value) } : pr))}
                      className="w-full h-2 bg-[var(--bg-hover)] rounded-full appearance-none cursor-pointer accent-[var(--accent-primary)]"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">Base Directive</label>
                  <textarea 
                    rows={4} 
                    value={p.systemPrompt} 
                    onChange={e => setProfiles(profiles.map(pr => pr.id === p.id ? { ...pr, systemPrompt: e.target.value } : pr))}
                    className="w-full bg-[var(--bg-hover)] border border-[var(--border)] rounded-2xl p-5 text-sm font-medium outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/20 resize-none transition-all"
                    placeholder="Provide the core instructions for this entity..."
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* Memory Context Modal */}
      <Modal isOpen={isMemoryOpen} onClose={() => setIsMemoryOpen(false)} title={`${activeProfile.name} Context`}>
        <div className="space-y-8">
          <div className="p-5 bg-[var(--accent-primary)]/5 border border-[var(--accent-primary)]/10 rounded-2xl text-xs leading-relaxed font-medium">
            <p><span className="font-black uppercase text-[var(--accent-primary)] mr-2">Note:</span> These insights are strictly localized to this profile. Syncing chat data transforms conversations into persistent cognitive recall.</p>
          </div>
          
          <div className="space-y-6">
            {(['identity', 'personality', 'behavior', 'notes'] as const).map(field => (
              <div key={field} className="space-y-3">
                <label className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">{field}</label>
                <textarea 
                  value={activeProfile.memory[field]} 
                  onChange={e => setProfiles(profiles.map(pr => pr.id === activeProfile.id ? { ...pr, memory: { ...pr.memory, [field]: e.target.value } } : pr))}
                  className="w-full bg-[var(--bg-tertiary)] border border(--border) rounded-2xl p-5 text-sm font-medium outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/20 transition-all resize-none"
                  placeholder={`Define user ${field}...`}
                  rows={2}
                />
              </div>
            ))}
            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">Synthesized Recall</label>
              <div className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6 text-sm italic text-[var(--text-secondary)] font-medium min-h-[100px] shadow-inner">
                {activeProfile.memory.summary || "Cognitive recall empty. Please sync recent data."}
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button 
              onClick={() => { if (confirm("Erase context for this profile?")) setProfiles(profiles.map(pr => pr.id === activeProfile.id ? { ...pr, memory: { ...DEFAULT_MEMORY } } : pr)); }}
              className="px-6 py-3.5 text-xs font-black uppercase tracking-widest text-red-500 hover:bg-red-500/10 rounded-2xl transition-all"
            >
              Purge Recall
            </button>
            <button 
              onClick={() => setIsMemoryOpen(false)}
              className="flex-1 py-4 bg-[var(--accent-primary)] text-[var(--bg-primary)] rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all btn-tactile"
            >
              Commit Context
            </button>
          </div>
        </div>
      </Modal>

      {/* Global Settings */}
      <Modal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} title="System Config">
        <div className="space-y-10">
          <div className="space-y-4">
            <label className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">OpenRouter Credentials</label>
            <div className="relative group">
              <input 
                type="password" 
                value={settings.openRouterApiKey} 
                onChange={e => setSettings({ ...settings, openRouterApiKey: e.target.value })}
                className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-2xl p-5 text-sm font-bold outline-none focus:ring-4 focus:ring-[var(--accent-primary)]/10 transition-all"
                placeholder="sk-or-v1-..."
              />
              <div className="absolute right-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-widest group-hover:text-white transition-colors">Key Required</div>
            </div>
            <p className="text-[10px] text-[var(--text-muted)] font-medium leading-relaxed px-2">Integrating OpenRouter grants access to models like Claude, GPT-4, and Llama within your profiles.</p>
          </div>
          
          <div className="space-y-4">
            <label className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">Visual Atmosphere</label>
            <div className="grid grid-cols-3 gap-4">
              {(['amoled', 'blue', 'red'] as const).map(f => (
                <button 
                  key={f}
                  onClick={() => setSettings({ ...settings, themeFamily: f })}
                  className={`py-6 rounded-2xl border-4 transition-all capitalize font-black text-sm shadow-xl ${settings.themeFamily === f ? 'border-[var(--accent-primary)] bg-[var(--bg-active)]' : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--text-muted)]'}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <button 
            onClick={() => setSettings({ ...settings, isDarkMode: !settings.isDarkMode })}
            className="w-full py-5 bg-[var(--bg-tertiary