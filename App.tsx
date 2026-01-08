import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Conversation, AIProfile, Role, Message, Settings, UserMemory 
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

// --- Components ---

const MessageBubble: React.FC<{
  message: Message;
  profile: AIProfile;
  onRetry?: () => void;
}> = ({ message, profile, onRetry }) => {
  const isUser = message.role === Role.USER;
  
  const contentHtml = useMemo(() => {
    try {
      // Configure marked options for safer and more robust parsing
      const rawHtml = marked.parse(message.content, {
        breaks: true,
        gfm: true,
      }) as string;
      return { __html: rawHtml };
    } catch (e) {
      console.error("Markdown parse error:", e);
      return { __html: message.content };
    }
  }, [message.content]);

  return (
    <div className={`flex gap-3 md:gap-5 p-4 md:p-8 rounded-[2rem] transition-all group animate-in slide-in-from-bottom-4 duration-500 ${isUser ? 'bg-[var(--bg-active)]/20 ml-auto max-w-[85%] border border-[var(--border)]/30' : 'mr-auto max-w-[95%]'}`}>
      <div className={`w-9 h-9 md:w-11 md:h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-2xl ${isUser ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] order-last' : 'bg-[var(--bg-tertiary)] border border-[var(--border)] text-[var(--text-muted)]'}`}>
        {isUser ? <UserIcon size={22} /> : <BotIcon size={22} />}
      </div>
      <div className={`flex-1 space-y-2 overflow-hidden ${isUser ? 'text-right' : 'text-left'}`}>
        <div className={`flex items-center gap-2 mb-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--text-muted)]">{isUser ? 'You' : profile.name}</span>
          <span className="text-[10px] text-[var(--text-muted)] opacity-30 font-bold">{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div 
          className={`markdown-body max-w-none ${isUser ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] font-medium'}`}
          dangerouslySetInnerHTML={contentHtml}
        />
        {message.isError && (
          <button 
            onClick={onRetry}
            className="mt-6 px-5 py-2.5 bg-red-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-red-500/20 active:scale-95 transition-all"
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

  const selectedOption = useMemo(() => options.find(o => o.id === value), [options, value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-5 py-4 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-2xl text-sm transition-all focus:ring-4 focus:ring-[var(--accent-primary)]/5 outline-none text-left"
      >
        <span className="truncate font-bold">{selectedOption?.name || "Select Model"}</span>
        <svg className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
      </button>

      {isOpen && (
        <div className="absolute z-[110] w-full mt-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-[1.5rem] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="p-3 border-b border-[var(--border)]">
            <input
              autoFocus
              className="w-full px-4 py-2.5 bg-[var(--bg-tertiary)] rounded-xl text-xs outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
              placeholder={placeholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-2 space-y-1">
            {filtered.length > 0 ? filtered.map(opt => (
              <button
                key={opt.id}
                onClick={() => { onChange(opt.id); setIsOpen(false); setQuery(''); }}
                className={`w-full text-left px-4 py-3 rounded-xl text-xs transition-all ${value === opt.id ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] font-black' : 'hover:bg-[var(--bg-hover)]'}`}
              >
                {opt.name}
              </button>
            )) : (
              <div className="px-4 py-6 text-center text-xs text-[var(--text-muted)] italic">No compatible models found</div>
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-500">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] w-full max-w-2xl rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-500">
        <div className="px-10 py-8 border-b border-[var(--border)] flex justify-between items-center">
          <h2 className="text-3xl font-black tracking-tighter text-[var(--text-primary)]">{title}</h2>
          <button onClick={onClose} className="p-3 hover:bg-[var(--bg-hover)] rounded-full transition-all text-[var(--text-muted)] hover:text-white active:scale-90">
            <XMarkIcon size={28} />
          </button>
        </div>
        <div className="p-10 overflow-y-auto scroll-smooth">
          {children}
        </div>
      </div>
    </div>
  );
};

// --- PWA Prompt ---

const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!sessionStorage.getItem('pwa-declined')) setIsVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setIsVisible(false);
    setDeferredPrompt(null);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[200] w-[92%] max-w-md bg-[var(--bg-secondary)] border border-[var(--accent-primary)]/10 rounded-[2.5rem] shadow-[0_30px_70px_rgba(0,0,0,0.6)] p-8 animate-in slide-in-from-bottom-12 duration-700">
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-[var(--accent-primary)] rounded-3xl flex items-center justify-center text-[var(--bg-primary)] shadow-2xl rotate-3">
            <BrainIcon size={32} />
          </div>
          <div>
            <h3 className="font-black text-xl tracking-tight">Expand Your Mind</h3>
            <p className="text-[11px] text-[var(--text-secondary)] font-bold uppercase tracking-widest mt-1">Install Vivica Desktop App</p>
          </div>
        </div>
        <div className="flex gap-4">
          <button onClick={() => { setIsVisible(false); sessionStorage.setItem('pwa-declined', 'true'); }} className="flex-1 py-4 text-xs font-black uppercase tracking-widest text-[var(--text-muted)] hover:bg-[var(--bg-hover)] rounded-2xl transition-all">Later</button>
          <button onClick={handleInstall} className="flex-[2] py-4 bg-[var(--accent-primary)] text-[var(--bg-primary)] rounded-2xl font-black text-sm shadow-2xl active:scale-95 transition-all btn-tactile">Install Vivica</button>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

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

  // Persistence
  useEffect(() => {
    const c = localStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
    const p = localStorage.getItem(STORAGE_KEYS.PROFILES);
    const s = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (c) setConversations(JSON.parse(c));
    if (p) setProfiles(JSON.parse(p));
    if (s) setSettings(prev => ({ ...prev, ...JSON.parse(s) }));
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(conversations));
    localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    document.body.setAttribute('data-theme', `${settings.themeFamily}-${settings.isDarkMode ? 'dark' : 'light'}`);
  }, [conversations, profiles, settings]);

  // Model Registry Sync
  useEffect(() => {
    if (settings.openRouterApiKey) {
      fetch("https://openrouter.ai/api/v1/models")
        .then(res => res.json())
        .then(data => data.data && setExternalModels(data.data.map((m: any) => ({ id: m.id, name: m.name }))))
        .catch(console.error);
    } else setExternalModels([]);
  }, [settings.openRouterApiKey]);

  const activeConversation = useMemo(() => conversations.find(c => c.id === settings.activeConversationId), [conversations, settings.activeConversationId]);
  const activeProfile = useMemo(() => profiles.find(p => p.id === settings.activeProfileId) || profiles[0], [profiles, settings.activeProfileId]);
  const profileConversations = useMemo(() => conversations.filter(c => c.profileId === settings.activeProfileId), [conversations, settings.activeProfileId]);
  const allModels = useMemo(() => [...GEMINI_MODELS, ...externalModels], [externalModels]);

  const handleSendMessage = async (retryContent?: string) => {
    const content = retryContent || inputValue;
    if (!content.trim() || isGenerating) return;

    let targetId = settings.activeConversationId;
    if (!targetId) {
      targetId = Date.now().toString();
      const newConvo: Conversation = {
        id: targetId,
        title: content.slice(0, 32),
        lastUpdated: Date.now(),
        messages: [],
        profileId: settings.activeProfileId,
        isMemoryEnabled: true
      };
      setConversations([newConvo, ...conversations]);
      setSettings(prev => ({ ...prev, activeConversationId: targetId }));
    }

    const userMsg: Message = { id: Date.now().toString(), role: Role.USER, content, timestamp: Date.now(), profileId: settings.activeProfileId };
    setConversations(prev => prev.map(c => c.id === targetId ? { ...c, messages: [...c.messages, userMsg], lastUpdated: Date.now() } : c));
    setInputValue('');
    setIsGenerating(true);

    try {
      const assistantId = (Date.now() + 1).toString();
      setConversations(prev => prev.map(c => c.id === targetId ? { ...c, messages: [...c.messages, { id: assistantId, role: Role.ASSISTANT, content: '', timestamp: Date.now(), profileId: settings.activeProfileId }] } : c));
      
      let fullText = '';
      const stream = geminiService.streamChat([...(activeConversation?.messages || []), userMsg], activeProfile, !!activeConversation?.isMemoryEnabled, settings.openRouterApiKey);
      for await (const chunk of stream) {
        fullText += chunk;
        setConversations(prev => prev.map(c => c.id === targetId ? { ...c, messages: c.messages.map(m => m.id === assistantId ? { ...m, content: fullText } : m) } : c));
      }
    } catch (err: any) {
      setConversations(prev => prev.map(c => c.id === targetId ? { ...c, messages: c.messages.map(m => m.role === Role.ASSISTANT && !m.content ? { ...m, content: `Error: ${err.message}`, isError: true } : m) } : c));
    } finally {
      setIsGenerating(false);
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="flex h-screen w-full bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden font-inter transition-colors duration-700">
      <InstallPrompt />
      {isSidebarOpen && window.innerWidth <= 768 && <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-md animate-in fade-in" onClick={() => setIsSidebarOpen(false)} />}

      <aside className={`fixed md:relative z-50 h-full w-[310px] md:w-80 bg-[var(--bg-secondary)] border-r border-[var(--border)] transition-all duration-500 flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:hidden'}`}>
        <div className="p-8 border-b border-[var(--border)] flex items-center justify-between h-[var(--header-height)]">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 bg-gradient-to-br from-[var(--accent-primary)] to-[var(--text-muted)] rounded-2xl flex items-center justify-center text-[var(--bg-primary)] shadow-2xl rotate-3">
              <BrainIcon size={26} />
            </div>
            <span className="font-black tracking-tighter text-2xl">Vivica</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 hover:bg-[var(--bg-hover)] rounded-xl transition-all"><XMarkIcon /></button>
        </div>

        <div className="p-6">
          <button onClick={() => {
            const id = Date.now().toString();
            setConversations([{ id, title: 'New Stream', profileId: settings.activeProfileId, lastUpdated: Date.now(), messages: [], isMemoryEnabled: true }, ...conversations]);
            setSettings(prev => ({ ...prev, activeConversationId: id }));
            if (window.innerWidth <= 768) setIsSidebarOpen(false);
          }} className="w-full py-4 bg-[var(--accent-primary)] text-[var(--bg-primary)] rounded-[1.25rem] font-black text-sm uppercase tracking-widest shadow-2xl hover:scale-[1.02] active:scale-95 transition-all btn-tactile">
            + New Workspace
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 space-y-1.5 py-2">
          {profileConversations.map(convo => (
            <div key={convo.id} onClick={() => { setSettings(prev => ({ ...prev, activeConversationId: convo.id })); if (window.innerWidth <= 768) setIsSidebarOpen(false); }} className={`group flex items-center gap-4 px-4 py-5 rounded-[1.25rem] cursor-pointer transition-all border ${settings.activeConversationId === convo.id ? 'bg-[var(--bg-active)] border-[var(--accent-primary)]/20 shadow-xl' : 'hover:bg-[var(--bg-hover)] border-transparent'}`}>
              <div className="flex-1 truncate">
                <p className={`text-sm font-bold truncate ${settings.activeConversationId === convo.id ? 'text-white' : 'text-[var(--text-secondary)]'}`}>{convo.title}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mt-1.5 opacity-60">{new Date(convo.lastUpdated).toLocaleDateString()}</p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); setConversations(conversations.filter(c => c.id !== convo.id)); }} className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-all"><TrashIcon size={16} /></button>
            </div>
          ))}
        </div>

        <div className="p-8 border-t border-[var(--border)] space-y-2 bg-[var(--bg-tertiary)]/30 backdrop-blur-md">
          <button onClick={() => setIsProfileManagerOpen(true)} className="w-full flex items-center gap-3 px-4 py-3 text-xs font-black uppercase tracking-widest text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-hover)] rounded-2xl transition-all">
            <UserIcon size={20} /> Profiles
          </button>
          <button onClick={() => setIsSettingsOpen(true)} className="w-full flex items-center gap-3 px-4 py-3 text-xs font-black uppercase tracking-widest text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-hover)] rounded-2xl transition-all">
            <SettingsIcon size={20} /> Config
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full min-w-0 relative">
        <header className="h-[var(--header-height)] border-b border-[var(--border)] bg-[var(--bg-secondary)]/80 backdrop-blur-3xl flex items-center justify-between px-8 z-30 shadow-2xl">
          <div className="flex items-center gap-5 truncate">
            {!isSidebarOpen && <button onClick={() => setIsSidebarOpen(true)} className="p-3 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] rounded-2xl transition-all"><MenuIcon /></button>}
            <div className="truncate flex flex-col">
              <h1 className="font-black text-xl truncate tracking-tight uppercase leading-none">{activeConversation?.title || 'Vivica Operating System'}</h1>
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] mt-1.5">{activeProfile.name} • {activeProfile.model.split('/').pop()}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button disabled={isSummarizing || !activeConversation} onClick={async () => {
              setIsSummarizing(true);
              const summary = await geminiService.summarizeConversation(activeConversation!.messages, activeProfile);
              setProfiles(profiles.map(p => p.id === activeProfile.id ? { ...p, memory: { ...p.memory, summary } } : p));
              setIsSummarizing(false);
            }} className="hidden sm:flex items-center gap-2.5 px-5 py-2.5 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-active)] rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-[var(--border)] active:scale-95 disabled:opacity-30">
              {isSummarizing ? <div className="w-3.5 h-3.5 border-2 border-[var(--text-muted)] border-t-white animate-spin rounded-full"/> : <BrainIcon size={16} />}
              Sync
            </button>
            <div className="h-8 w-px bg-[var(--border)] mx-1 hidden sm:block" />
            <select value={settings.activeProfileId} onChange={(e) => setSettings(prev => ({ ...prev, activeProfileId: e.target.value, activeConversationId: null }))} className="bg-[var(--bg-tertiary)] border border-[var(--border)] text-[10px] font-black uppercase tracking-widest py-2.5 px-4 rounded-2xl outline-none cursor-pointer hover:bg-[var(--bg-active)] transition-all">
              {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-12 pb-44 space-y-6 scroll-smooth">
          <div className="max-w-4xl mx-auto w-full">
            {!activeConversation ? (
              <div className="flex flex-col items-center justify-center py-32 text-center space-y-10 animate-in fade-in zoom-in-95 duration-700">
                <div className="w-28 h-28 bg-gradient-to-tr from-[var(--bg-secondary)] to-[var(--bg-hover)] rounded-[2.75rem] flex items-center justify-center text-[var(--accent-primary)] shadow-[0_40px_100px_rgba(0,0,0,0.5)] border border-[var(--border)] rotate-3">
                  <BrainIcon size={56} />
                </div>
                <div className="space-y-4">
                  <h2 className="text-5xl font-black tracking-tighter leading-tight">Ignite your <span className="text-[var(--accent-primary)]">intelligence.</span></h2>
                  <p className="text-[var(--text-secondary)] font-bold text-lg max-w-md mx-auto leading-relaxed">Unified AI Workspace with persistent cognitive context.</p>
                </div>
                <button onClick={() => setIsSidebarOpen(true)} className="px-12 py-5 bg-white text-black rounded-[1.5rem] font-black text-sm uppercase tracking-widest shadow-[0_20px_60px_rgba(255,255,255,0.2)] active:scale-95 transition-all">Access Nexus</button>
              </div>
            ) : activeConversation.messages.map(msg => (
              <MessageBubble key={msg.id} message={msg} profile={profiles.find(p => p.id === msg.profileId) || activeProfile} onRetry={() => handleSendMessage(msg.content)} />
            ))}
            {isGenerating && <div className="flex gap-5 animate-pulse px-6 py-4"><div className="w-11 h-11 rounded-2xl bg-[var(--bg-tertiary)] flex-shrink-0" /><div className="space-y-3 flex-1 pt-3"><div className="h-4 bg-[var(--bg-secondary)] rounded-lg w-3/4" /><div className="h-4 bg-[var(--bg-secondary)] rounded-lg w-1/2" /></div></div>}
            <div ref={chatEndRef} className="h-10" />
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 bg-gradient-to-t from-[var(--bg-primary)] via-[var(--bg-primary)]/90 to-transparent pointer-events-none">
          <div className="max-w-4xl mx-auto relative pointer-events-auto">
            <div className="bg-[var(--bg-secondary)]/90 backdrop-blur-3xl border border-[var(--border)] rounded-[2.5rem] p-2.5 pr-4 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.8)] flex items-end gap-3 transition-all focus-within:ring-[8px] focus-within:ring-[var(--accent-primary)]/5">
              <textarea ref={inputRef} rows={1} value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }}} placeholder={`Command ${activeProfile.name.split(' ')[0]}...`} className="flex-1 bg-transparent border-none rounded-[1.75rem] px-6 py-4.5 outline-none resize-none max-h-56 min-h-[66px] text-base font-semibold placeholder:text-[var(--text-muted)]/40 scrollbar-none" />
              <button onClick={() => handleSendMessage()} disabled={!inputValue.trim() || isGenerating} className="mb-2 p-4.5 bg-[var(--accent-primary)] text-[var(--bg-primary)] rounded-[1.75rem] shadow-2xl transition-all hover:scale-105 active:scale-95 disabled:opacity-20 disabled:grayscale btn-tactile">
                <SendIcon size={26} />
              </button>
            </div>
            <p className="mt-4 text-center text-[9px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)]/40">Secure Processing Active • V2.5 Native</p>
          </div>
        </div>
      </main>

      <Modal isOpen={isProfileManagerOpen} onClose={() => setIsProfileManagerOpen(false)} title="Repository">
        <div className="space-y-10">
          <button onClick={() => setProfiles([...profiles, { id: Date.now().toString(), name: 'New Unit', model: GEMINI_MODELS[0].id, temperature: 0.7, systemPrompt: 'Advanced Assistant', memory: { ...DEFAULT_MEMORY } }])} className="w-full py-6 border-4 border-dashed border-[var(--border)] rounded-[2.25rem] text-[var(--text-muted)] hover:text-white hover:border-[var(--accent-primary)] transition-all flex flex-col items-center gap-3 hover:bg-[var(--bg-hover)] group">
            <PlusIcon size={32} className="group-hover:rotate-90 transition-transform duration-500" />
            <span className="font-black text-xs uppercase tracking-[0.2em]">Deploy New Unit</span>
          </button>
          
          <div className="space-y-8">
            {profiles.map(p => (
              <div key={p.id} className="p-8 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-[2.5rem] space-y-8 shadow-inner border-l-[12px] border-l-[var(--accent-primary)] hover:scale-[1.01] transition-transform">
                <div className="flex justify-between items-center">
                  <input value={p.name} onChange={(e) => setProfiles(profiles.map(pr => pr.id === p.id ? { ...pr, name: e.target.value } : pr))} className="flex-1 bg-transparent text-3xl font-black outline-none focus:text-[var(--accent-primary)] tracking-tighter" />
                  <div className="flex items-center gap-3">
                    <button onClick={() => { setIsProfileManagerOpen(false); setSettings(prev => ({ ...prev, activeProfileId: p.id })); setIsMemoryOpen(true); }} className="px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">Cognition</button>
                    {!p.isDefault && <button onClick={() => setProfiles(profiles.filter(pr => pr.id !== p.id))} className="p-3 text-red-500 hover:bg-red-500/10 rounded-2xl transition-all"><TrashIcon size={20} /></button>}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Model Chain</label>
                    <SearchableSelect options={allModels} value={p.model} onChange={(v) => setProfiles(profiles.map(pr => pr.id === p.id ? { ...pr, model: v } : pr))} />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Entropy ({p.temperature})</label>
                    <input type="range" min="0" max="1" step="0.1" value={p.temperature} onChange={e => setProfiles(profiles.map(pr => pr.id === p.id ? { ...pr, temperature: parseFloat(e.target.value) } : pr))} className="w-full h-3 bg-[var(--bg-hover)] rounded-full appearance-none cursor-pointer accent-[var(--accent-primary)]" />
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Primary Directive</label>
                  <textarea rows={5} value={p.systemPrompt} onChange={e => setProfiles(profiles.map(pr => pr.id === p.id ? { ...pr, systemPrompt: e.target.value } : pr))} className="w-full bg-[var(--bg-hover)] border border-[var(--border)] rounded-2xl p-6 text-sm font-bold outline-none focus:ring-4 focus:ring-[var(--accent-primary)]/10 resize-none transition-all" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      <Modal isOpen={isMemoryOpen} onClose={() => setIsMemoryOpen(false)} title="Cognitive Nexus">
        <div className="space-y-8">
          {(['identity', 'personality', 'behavior', 'notes'] as const).map(f => (
            <div key={f} className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">{f}</label>
              <textarea value={activeProfile.memory[f]} onChange={e => setProfiles(profiles.map(pr => pr.id === activeProfile.id ? { ...pr, memory: { ...pr.memory, [f]: e.target.value } } : pr))} className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-[1.5rem] p-6 text-sm font-bold outline-none focus:ring-4 focus:ring-[var(--accent-primary)]/10 resize-none" rows={3} placeholder={`Define ${f}...`} />
            </div>
          ))}
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Recent Synthesis</label>
            <div className="p-8 bg-black/40 border border-[var(--border)] rounded-[2rem] text-sm italic font-medium leading-relaxed shadow-inner opacity-80">{activeProfile.memory.summary || "No Synthesis Available. Execute Sync to Update Recall."}</div>
          </div>
          <div className="flex gap-4 pt-6">
            <button onClick={() => confirm("Purge Cognitive Nexus?") && setProfiles(profiles.map(pr => pr.id === activeProfile.id ? { ...pr, memory: { ...DEFAULT_MEMORY } } : pr))} className="px-8 py-5 text-xs font-black uppercase tracking-widest text-red-500 hover:bg-red-500/10 rounded-[1.5rem] transition-all">Purge Nexus</button>
            <button onClick={() => setIsMemoryOpen(false)} className="flex-1 py-5 bg-[var(--accent-primary)] text-[var(--bg-primary)] rounded-[1.5rem] font-black text-sm uppercase tracking-widest shadow-2xl active:scale-95 transition-all">Commit Context</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} title="Config">
        <div className="space-y-12">
          <div className="space-y-5">
            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Nexus Bridge Key (OpenRouter)</label>
            <input type="password" value={settings.openRouterApiKey} onChange={e => setSettings({ ...settings, openRouterApiKey: e.target.value })} className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-3xl p-6 text-sm font-black outline-none focus:ring-8 focus:ring-[var(--accent-primary)]/5" placeholder="sk-or-v1-..." />
          </div>
          <div className="space-y-5">
            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Atmosphere</label>
            <div className="grid grid-cols-3 gap-4">
              {(['amoled', 'blue', 'red'] as const).map(f => (
                <button key={f} onClick={() => setSettings({ ...settings, themeFamily: f })} className={`py-8 rounded-[2rem] border-4 font-black uppercase text-xs tracking-widest transition-all ${settings.themeFamily === f ? 'border-[var(--accent-primary)] bg-[var(--bg-active)] scale-105 shadow-2xl' : 'border-[var(--border)] text-[var(--text-muted)]'}`}>{f}</button>
              ))}
            </div>
          </div>
          <button onClick={() => setSettings({ ...settings, isDarkMode: !settings.isDarkMode })} className="w-full py-6 bg-[var(--bg-tertiary)] rounded-[2rem] flex items-center justify-center gap-4 font-black text-xs uppercase tracking-[0.3em] shadow-xl group border border-[var(--border)]">
            {settings.isDarkMode ? <SunIcon size={24} className="group-hover:rotate-90 transition-transform" /> : <MoonIcon size={24} className="group-hover:-rotate-12 transition-transform" />}
            Phase Toggle
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default App;