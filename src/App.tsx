import React, { useState, useEffect } from 'react';
import { db, auth, googleProvider, signInWithPopup, signOut, doc, getDocFromServer } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import KnowledgeBaseManager from './components/KnowledgeBaseManager';
import Chatbot from './components/Chatbot';
import { Database, MessageSquare, LogOut, LogIn, Sparkles, ShieldCheck, AlertCircle } from 'lucide-react';
import { cn } from './lib/utils';

export default function App() {
  const [activeTab, setActiveTab] = useState<'knowledge' | 'chat'>('knowledge');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
        setConnectionError(null);
      } catch (error: any) {
        if (error.message?.includes('the client is offline')) {
          setConnectionError("Firestore connection failed. Please ensure you have created a Firestore database in your Firebase Console.");
        } else if (error.code === 'permission-denied') {
          // If it's permission denied on the test doc, the database is reachable
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
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">Initializing Assistant...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 text-center border border-slate-100">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg mx-auto mb-8">
            <Sparkles size={32} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-3 tracking-tight">Knowledge Assistant</h1>
          <p className="text-slate-500 mb-10 leading-relaxed">
            Connect your organizational knowledge base to a powerful AI assistant.
          </p>
          <button 
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-slate-200 text-slate-700 px-6 py-4 rounded-2xl hover:bg-slate-50 hover:border-indigo-200 transition-all font-bold shadow-sm"
          >
            <LogIn size={20} />
            <span>Sign in with Google</span>
          </button>
          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-400 font-medium">
            <ShieldCheck size={14} />
            <span>Secure Enterprise Authentication</span>
          </div>
        </div>
      </div>
    );
  }

  const userId = user.uid;

  return (
    <div className="h-screen w-full flex bg-paper overflow-hidden font-sans selection:bg-accent/10 selection:text-accent">
      {/* Minimalist Sidebar */}
      <nav className="w-24 bg-white border-r-4 border-ink flex flex-col items-center py-10 justify-between z-20">
        <div className="flex flex-col items-center gap-12">
          <div className="w-14 h-14 bg-ink flex items-center justify-center text-paper shadow-[4px_4px_0px_0px_rgba(90,90,64,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all duration-200 cursor-pointer">
            <Sparkles size={32} strokeWidth={2} />
          </div>
          
          <div className="flex flex-col gap-8">
            <button 
              onClick={() => setActiveTab('knowledge')}
              className={cn(
                "p-4 transition-all duration-200 relative group border-2",
                activeTab === 'knowledge' ? "bg-accent text-paper border-ink shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]" : "text-slate-300 border-transparent hover:text-ink hover:border-ink"
              )}
            >
              <Database size={28} strokeWidth={2} />
              <div className={cn(
                "absolute left-full ml-8 px-4 py-2 bg-ink text-paper text-xs rounded-none opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap pointer-events-none font-bold tracking-widest uppercase translate-x-[-10px] group-hover:translate-x-0 shadow-[4px_4px_0px_0px_rgba(90,90,64,1)]",
              )}>Repository</div>
            </button>
            
            <button 
              onClick={() => setActiveTab('chat')}
              className={cn(
                "p-4 transition-all duration-200 relative group border-2",
                activeTab === 'chat' ? "bg-accent text-paper border-ink shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]" : "text-slate-300 border-transparent hover:text-ink hover:border-ink"
              )}
            >
              <MessageSquare size={28} strokeWidth={2} />
              <div className={cn(
                "absolute left-full ml-8 px-4 py-2 bg-ink text-paper text-xs rounded-none opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap pointer-events-none font-bold tracking-widest uppercase translate-x-[-10px] group-hover:translate-x-0 shadow-[4px_4px_0px_0px_rgba(90,90,64,1)]",
              )}>Assistant</div>
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center gap-10">
          <button 
            onClick={handleLogout}
            className="p-4 bg-white border-4 border-ink text-slate-300 hover:text-red-500 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all duration-200 group relative"
            title="Terminate Session"
          >
            <LogOut size={28} strokeWidth={3} />
          </button>
          
          <div className="relative group cursor-pointer">
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || ''} className="w-12 h-12 border-4 border-ink grayscale hover:grayscale-0 transition-all duration-200" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-12 h-12 bg-accent text-paper border-4 border-ink flex items-center justify-center font-bold text-xl">
                {user.displayName?.charAt(0) || 'U'}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-hidden flex flex-col">
        {connectionError && (
          <div className="bg-red-50/50 backdrop-blur-md border-b border-red-100 p-4 flex items-center gap-4 text-red-600 text-[11px] font-bold uppercase tracking-widest z-30">
            <AlertCircle size={16} />
            <span>{connectionError}</span>
            <a 
              href={`https://console.firebase.google.com/project/gen-lang-client-0644834933/firestore`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="ml-auto underline hover:text-red-700"
            >
              Open Console
            </a>
          </div>
        )}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'knowledge' ? (
            <KnowledgeBaseManager userId={userId} />
          ) : (
            <Chatbot userId={userId} />
          )}
        </div>
      </main>
    </div>
  );
}
