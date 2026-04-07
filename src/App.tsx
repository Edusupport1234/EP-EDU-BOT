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
    <div className="h-screen w-full flex bg-slate-50 overflow-hidden font-sans">
      {/* Modern Sidebar */}
      <nav className="w-20 bg-white border-r border-slate-200 flex flex-col items-center py-6 justify-between z-20 shadow-sm">
        <div className="flex flex-col items-center gap-8">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
            <Sparkles size={20} />
          </div>
          
          <div className="flex flex-col gap-4">
            <button 
              onClick={() => setActiveTab('knowledge')}
              className={cn(
                "p-3.5 rounded-xl transition-all group relative",
                activeTab === 'knowledge' ? "bg-indigo-50 text-indigo-600" : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
              )}
            >
              <Database size={22} />
              <span className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none font-medium">Repository</span>
            </button>
            
            <button 
              onClick={() => setActiveTab('chat')}
              className={cn(
                "p-3.5 rounded-xl transition-all group relative",
                activeTab === 'chat' ? "bg-indigo-50 text-indigo-600" : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
              )}
            >
              <MessageSquare size={22} />
              <span className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none font-medium">Assistant</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center gap-6">
          <button 
            onClick={handleLogout}
            className="p-3.5 rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all group relative"
          >
            <LogOut size={22} />
            <span className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none font-medium">Logout</span>
          </button>
          
          <div className="relative group">
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || ''} className="w-9 h-9 rounded-full border border-slate-200" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-indigo-100 border border-slate-200 flex items-center justify-center text-indigo-600 font-bold text-xs">
                {user.displayName?.charAt(0) || 'U'}
              </div>
            )}
            <div className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none font-medium">
              {user.displayName || 'User'}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-hidden flex flex-col">
        {connectionError && (
          <div className="bg-red-50 border-b border-red-100 p-4 flex items-center gap-3 text-red-600 text-sm font-medium animate-in slide-in-from-top duration-300">
            <AlertCircle size={18} />
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
