import React, { useState, useEffect } from 'react';
import { auth, googleProvider, signInWithPopup, signOut } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import KnowledgeBaseManager from './components/KnowledgeBaseManager';
import Chatbot from './components/Chatbot';
import { Database, MessageSquare, LogOut, LogIn, Sparkles, ShieldCheck } from 'lucide-react';
import { cn } from './lib/utils';

export default function App() {
  const [activeTab, setActiveTab] = useState<'knowledge' | 'chat'>('knowledge');
  const userId = "default-user";

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
            <div className="w-9 h-9 rounded-full bg-indigo-100 border border-slate-200 flex items-center justify-center text-indigo-600 font-bold text-xs">
              AD
            </div>
            <div className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none font-medium">
              Admin User
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-hidden">
        {activeTab === 'knowledge' ? (
          <KnowledgeBaseManager userId={userId} />
        ) : (
          <Chatbot userId={userId} />
        )}
      </main>
    </div>
  );
}
