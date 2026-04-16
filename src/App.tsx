import React, { useState, useEffect } from 'react';
import { db, auth, googleProvider, signInWithPopup, signOut, doc, getDocFromServer } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { motion, Reorder } from 'framer-motion';
import KnowledgeBaseManager from './components/KnowledgeBaseManager';
import Chatbot from './components/Chatbot';
import Calendar from './components/Calendar';
import Settings from './components/Settings';
import ErrorBoundary from './components/ErrorBoundary';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { Database, MessageSquare, Calendar as CalendarIcon, LogOut, LogIn, Sparkles, ShieldCheck, AlertCircle, Moon, Sun, Settings as SettingsIcon } from 'lucide-react';
import { cn } from './lib/utils';

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}

function AppContent() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'knowledge' | 'chat' | 'calendar' | 'settings'>('knowledge');
  const [repoSearch, setRepoSearch] = useState('');
  const [prefilledEvent, setPrefilledEvent] = useState<any>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });

  const [sidebarItems, setSidebarItems] = useState<string[]>(() => {
    const saved = localStorage.getItem('sidebar_order');
    const defaultOrder = ['knowledge', 'chat', 'calendar', 'settings', 'theme', 'logout'];
    if (!saved) return defaultOrder;
    
    const parsed = JSON.parse(saved) as string[];
    // Ensure 'settings' and 'calendar' are included if they're missing from a previous save
    if (!parsed.includes('settings')) {
      const themeIndex = parsed.indexOf('theme');
      if (themeIndex !== -1) parsed.splice(themeIndex, 0, 'settings');
      else parsed.push('settings');
    }
    if (!parsed.includes('calendar')) {
      const chatIndex = parsed.indexOf('chat');
      if (chatIndex !== -1) parsed.splice(chatIndex + 1, 0, 'calendar');
      else parsed.push('calendar');
    }
    return parsed;
  });

  useEffect(() => {
    localStorage.setItem('sidebar_order', JSON.stringify(sidebarItems));
  }, [sidebarItems]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  useEffect(() => {
    const checkConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
        setConnectionError(null);
      } catch (error: any) {
        console.error("Connection check error:", error);
        if (error.message?.includes('the client is offline')) {
          setConnectionError(t('connectionFailed'));
        } else if (error.code === 'resource-exhausted' || error.message?.includes('resource-exhausted') || error.message?.includes('Quota exceeded')) {
          setConnectionError(t('quotaExceeded'));
        } else if (error.code === 'permission-denied') {
          setConnectionError(null);
        }
      }
    };
    checkConnection();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-paper">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
          <p className="text-ink/40 font-medium tracking-widest text-xs">{t('initializing')}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-paper p-4">
        <div className="max-w-md w-full bg-card-bg border-4 border-ink p-10 text-center shadow-[16px_16px_0px_0px_var(--color-shadow)]">
          <div className="text-ink mx-auto mb-8">
            <Sparkles size={64} />
          </div>
          <h1 className="text-4xl font-bold text-ink mb-3 tracking-tight">{t('knowledgeAssistant')}</h1>
          <p className="text-ink/60 mb-10 leading-relaxed font-bold tracking-widest text-sm">
            {t('connectKnowledge')}
          </p>
          <button 
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 bg-card-bg border-4 border-ink text-ink px-6 py-4 hover:bg-accent hover:text-paper transition-all font-bold shadow-[8px_8px_0px_0px_var(--color-shadow)] active:shadow-none active:translate-x-1 active:translate-y-1 tracking-widest"
          >
            <LogIn size={20} />
            <span>{t('signInGoogle')}</span>
          </button>
          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-ink-muted font-medium">
            <ShieldCheck size={14} />
            <span>{t('secureAuth')}</span>
          </div>
        </div>
      </div>
    );
  }

  const userId = user.uid;

  return (
    <ErrorBoundary>
      <div className="h-screen w-full flex bg-paper overflow-hidden font-sans selection:bg-accent/10 selection:text-accent">
      {/* Minimalist Sidebar */}
      <nav className="w-20 bg-card-bg border-r-2 border-ink flex flex-col items-center py-12 justify-between z-20">
        <div className="flex flex-col items-center gap-16 w-full">
          <div className="text-ink hover:text-accent transition-all duration-300 cursor-pointer">
            <Sparkles size={32} strokeWidth={2} />
          </div>
          
          <Reorder.Group 
            axis="y" 
            values={sidebarItems} 
            onReorder={setSidebarItems} 
            className="flex flex-col gap-10 w-full items-center"
          >
            {sidebarItems.map((id) => (
              <Reorder.Item 
                key={id} 
                value={id} 
                className="w-full flex justify-center cursor-grab active:cursor-grabbing"
              >
                {id === 'knowledge' && (
                  <button 
                    onClick={() => {
                      setRepoSearch('');
                      setActiveTab('knowledge');
                    }}
                    className={cn(
                      "p-3 transition-all duration-300 relative group",
                      activeTab === 'knowledge' ? "text-ink" : "text-ink-muted hover:text-ink"
                    )}
                  >
                    <Database size={24} strokeWidth={2} />
                    {activeTab === 'knowledge' && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-accent" />
                    )}
                    <div className={cn(
                      "absolute left-full ml-6 px-3 py-1.5 bg-ink text-paper text-[10px] rounded-none opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap pointer-events-none font-bold tracking-widest translate-x-[-10px] group-hover:translate-x-0 shadow-[4px_4px_0px_0px_var(--color-accent)]",
                    )}>{t('repository')}</div>
                  </button>
                )}

                {id === 'chat' && (
                  <button 
                    onClick={() => setActiveTab('chat')}
                    className={cn(
                      "p-3 transition-all duration-300 relative group",
                      activeTab === 'chat' ? "text-ink" : "text-ink-muted hover:text-ink"
                    )}
                  >
                    <MessageSquare size={24} strokeWidth={2} />
                    {activeTab === 'chat' && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-accent" />
                    )}
                    <div className={cn(
                      "absolute left-full ml-6 px-3 py-1.5 bg-ink text-paper text-[10px] rounded-none opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap pointer-events-none font-bold tracking-widest translate-x-[-10px] group-hover:translate-x-0 shadow-[4px_4px_0px_0px_var(--color-accent)]",
                    )}>{t('assistant')}</div>
                  </button>
                )}

                {id === 'calendar' && (
                  <button 
                    onClick={() => setActiveTab('calendar')}
                    className={cn(
                      "p-3 transition-all duration-300 relative group",
                      activeTab === 'calendar' ? "text-ink" : "text-ink-muted hover:text-ink"
                    )}
                  >
                    <CalendarIcon size={24} strokeWidth={2} />
                    {activeTab === 'calendar' && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-accent" />
                    )}
                    <div className={cn(
                      "absolute left-full ml-6 px-3 py-1.5 bg-ink text-paper text-[10px] rounded-none opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap pointer-events-none font-bold tracking-widest translate-x-[-10px] group-hover:translate-x-0 shadow-[4px_4px_0px_0px_var(--color-accent)]",
                    )}>{t('calendar')}</div>
                  </button>
                )}

                {id === 'settings' && (
                  <button 
                    onClick={() => setActiveTab('settings')}
                    className={cn(
                      "p-3 transition-all duration-300 relative group",
                      activeTab === 'settings' ? "text-ink" : "text-ink-muted hover:text-ink"
                    )}
                  >
                    <SettingsIcon size={24} strokeWidth={2} />
                    {activeTab === 'settings' && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-accent" />
                    )}
                    <div className={cn(
                      "absolute left-full ml-6 px-3 py-1.5 bg-ink text-paper text-[10px] rounded-none opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap pointer-events-none font-bold tracking-widest translate-x-[-10px] group-hover:translate-x-0 shadow-[4px_4px_0px_0px_var(--color-accent)]",
                    )}>{t('settings')}</div>
                  </button>
                )}

                {id === 'theme' && (
                  <button 
                    onClick={toggleTheme}
                    className="p-3 transition-all duration-300 relative group text-ink-muted hover:text-ink"
                  >
                    {theme === 'light' ? <Moon size={24} strokeWidth={2} /> : <Sun size={24} strokeWidth={2} />}
                    <div className={cn(
                      "absolute left-full ml-6 px-3 py-1.5 bg-ink text-paper text-[10px] rounded-none opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap pointer-events-none font-bold tracking-widest translate-x-[-10px] group-hover:translate-x-0 shadow-[4px_4px_0px_0px_var(--color-shadow)]",
                    )}>{t('toggleTheme')}</div>
                  </button>
                )}

                {id === 'logout' && (
                  <button 
                    onClick={handleLogout}
                    className="p-3 text-ink-muted hover:text-red-500 transition-all duration-300 group relative"
                    title={t('terminateSession')}
                  >
                    <LogOut size={24} strokeWidth={2} />
                    <div className={cn(
                      "absolute left-full ml-6 px-3 py-1.5 bg-ink text-paper text-[10px] rounded-none opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap pointer-events-none font-bold tracking-widest translate-x-[-10px] group-hover:translate-x-0 shadow-[4px_4px_0px_0px_var(--color-shadow)]",
                    )}>{t('logout')}</div>
                  </button>
                )}
              </Reorder.Item>
            ))}
          </Reorder.Group>
        </div>

        <div className="flex flex-col items-center gap-10">
          <div className="relative group cursor-pointer">
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || ''} className="w-10 h-10 border-2 border-ink grayscale hover:grayscale-0 transition-all duration-300" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-10 h-10 bg-accent text-paper border-2 border-ink flex items-center justify-center font-bold text-lg">
                {user.displayName?.charAt(0) || 'U'}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-hidden flex flex-col">
        {connectionError && (
          <div className="bg-red-50/50 backdrop-blur-md border-b border-red-100 p-4 flex items-center gap-4 text-red-600 text-[11px] font-bold tracking-widest z-30">
            <AlertCircle size={16} />
            <span>{connectionError}</span>
            <a 
              href={`https://console.firebase.google.com/project/gen-lang-client-0644834933/firestore`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="ml-auto underline hover:text-red-700"
            >
              {t('openConsole')}
            </a>
          </div>
        )}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'knowledge' ? (
            <KnowledgeBaseManager userId={userId} initialSearch={repoSearch} />
          ) : activeTab === 'chat' ? (
            <Chatbot 
              userId={userId} 
              onNavigateToSource={(chunkId) => {
                setRepoSearch(chunkId);
                setActiveTab('knowledge');
              }} 
              onProposeEvent={(eventData) => {
                setPrefilledEvent(eventData);
                setActiveTab('calendar');
              }}
            />
          ) : activeTab === 'calendar' ? (
            <Calendar 
              userId={userId} 
              prefilledEvent={prefilledEvent} 
              onClearPrefilled={() => setPrefilledEvent(null)} 
            />
          ) : (
            <Settings />
          )}
        </div>
      </main>
    </div>
    </ErrorBoundary>
  );
}
