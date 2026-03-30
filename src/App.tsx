import React, { useState, useEffect } from 'react';
import { auth, googleProvider, signInWithPopup, signOut } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import KnowledgeBaseManager from './components/KnowledgeBaseManager';
import Chatbot from './components/Chatbot';
import { Database, MessageSquare, LogOut, LogIn, Sparkles, ShieldCheck } from 'lucide-react';
import { cn } from './lib/utils';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [activeTab, setActiveTab] = useState<'knowledge' | 'chat'>('knowledge');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (!isAuthReady) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg" />
          <span className="text-slate-500 font-medium">Loading Workspace...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-10 text-center space-y-8 border border-slate-200">
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto">
            <ShieldCheck className="text-indigo-600" size={32} />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Enterprise Knowledge AI</h1>
            <p className="text-slate-500">Securely train and deploy a custom AI assistant for your organization.</p>
          </div>
          <button 
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 bg-indigo-600 text-white py-3.5 rounded-xl hover:bg-indigo-700 transition-all font-semibold shadow-sm"
          >
            <LogIn size={18} />
            <span>Sign in with SSO</span>
          </button>
          <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 font-medium uppercase tracking-wider">
            <ShieldCheck size={12} />
            <span>Enterprise-Grade Security</span>
          </div>
        </div>
      </div>
    );
  }

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
          <div className="relative group">
            <img 
              src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} 
              alt="Profile" 
              className="w-9 h-9 rounded-full border border-slate-200"
              referrerPolicy="no-referrer"
            />
            <div className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none font-medium">
              {user.displayName}
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="p-3.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
          >
            <LogOut size={22} />
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-hidden">
        {activeTab === 'knowledge' ? (
          <KnowledgeBaseManager userId={user.uid} />
        ) : (
          <Chatbot userId={user.uid} />
        )}
      </main>
    </div>
  );
}
