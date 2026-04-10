import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { db, collection, query, where, onSnapshot, auth, setDoc, doc, deleteDoc, getDocs, orderBy, limit, addDoc, writeBatch } from '../firebase';
import { KnowledgeChunk, ChatMessage, ChatSession } from '../types';
import { Send, Bot, User, Loader2, Sparkles, Clock, Trash2, Plus, MessageSquare, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';

interface Props {
  userId: string;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function Chatbot({ userId }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [knowledge, setKnowledge] = useState<KnowledgeChunk[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string | 'all', title?: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load Knowledge Base
  useEffect(() => {
    const q = query(collection(db, 'knowledgeChunks'), where('userId', '==', userId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setKnowledge(snapshot.docs.map(doc => doc.data() as KnowledgeChunk));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'knowledgeChunks');
    });
    return () => unsubscribe();
  }, [userId]);

  // Load Chat Sessions
  useEffect(() => {
    const q = query(
      collection(db, 'chatSessions'), 
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSessions(snapshot.docs.map(doc => doc.data() as ChatSession));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'chatSessions');
    });
    return () => unsubscribe();
  }, [userId]);

  // Load Messages for Current Session
  useEffect(() => {
    if (!currentSessionId) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, 'chatSessions', currentSessionId, 'messages'),
      orderBy('timestamp', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => doc.data() as ChatMessage));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `chatSessions/${currentSessionId}/messages`);
    });
    return () => unsubscribe();
  }, [currentSessionId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const createNewSession = async (firstMessage: string) => {
    const sessionId = crypto.randomUUID();
    const session: ChatSession = {
      id: sessionId,
      userId,
      title: firstMessage.slice(0, 30) + (firstMessage.length > 30 ? '...' : ''),
      lastMessage: firstMessage,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    try {
      await setDoc(doc(db, 'chatSessions', sessionId), session);
      setCurrentSessionId(sessionId);
      return sessionId;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'chatSessions');
      return null;
    }
  };

  const saveMessage = async (sessionId: string, message: ChatMessage) => {
    try {
      await setDoc(doc(db, 'chatSessions', sessionId, 'messages', message.id), message);
      await setDoc(doc(db, 'chatSessions', sessionId), {
        lastMessage: message.content,
        updatedAt: Date.now()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `chatSessions/${sessionId}/messages`);
    }
  };

  const clearAllHistory = async () => {
    try {
      const batch = writeBatch(db);
      for (const session of sessions) {
        batch.delete(doc(db, 'chatSessions', session.id));
      }
      await batch.commit();
      setCurrentSessionId(null);
      setConfirmDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'chatSessions');
    }
  };

  const executeDeleteSession = async (sessionId: string) => {
    try {
      await deleteDoc(doc(db, 'chatSessions', sessionId));
      if (currentSessionId === sessionId) setCurrentSessionId(null);
      setConfirmDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `chatSessions/${sessionId}`);
    }
  };

  const deleteSession = (sessionId: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDelete({ id: sessionId, title });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      timestamp: Date.now(),
    };

    let sessionId = currentSessionId;
    if (!sessionId) {
      sessionId = await createNewSession(input);
    }

    if (!sessionId) return;

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Save user message
    await saveMessage(sessionId, userMessage);

    try {
      const apiKey = process.env.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Gemini API key not found. Please set GEMINI_API_KEY or VITE_GEMINI_API_KEY.");
      }
      const ai = new GoogleGenAI({ apiKey });
      const model = ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            role: "user",
            parts: [{ text: `
              You are a helpful AI assistant. Answer the user's question based ONLY on the provided knowledge base below.
              If the answer is not in the knowledge base, politely inform the user that you don't have that information yet.
              
              KNOWLEDGE BASE:
              ${knowledge.map(k => `--- ${k.category}: ${k.title} ---\nSUMMARY: ${k.summary}\nCONTENT: ${k.content}`).join('\n\n')}
              
              USER QUESTION:
              ${input}
              
              INSTRUCTIONS:
              1. Answer based ONLY on the knowledge base.
              2. Use the SUMMARY to quickly identify context and the CONTENT for detailed answers.
            ` }]
          }
        ],
        config: {
          systemInstruction: "You are a precise AI assistant that strictly follows the provided knowledge context. Keep answers concise and professional.",
        }
      });

      const response = await model;
      const content = response.text || "I'm sorry, I couldn't generate a response.";
      
      const aiMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'model',
        content: content.trim(),
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, aiMessage]);
      await saveMessage(sessionId, aiMessage);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'model',
        content: "An error occurred while processing your request.",
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
      await saveMessage(sessionId, errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full bg-paper relative overflow-hidden font-pixel selection:bg-accent/10 selection:text-accent">
      {/* Immersive Background */}
      <div className="absolute inset-0 atmosphere pointer-events-none" />
      
      {/* History Sidebar */}
      <div className={cn(
        "fixed inset-y-0 right-0 w-96 bg-white border-l-4 border-ink z-40 transition-transform duration-300 shadow-[-12px_0px_0px_0px_rgba(26,26,26,0.1)] flex flex-col",
        showHistory ? "translate-x-0" : "translate-x-full"
      )}>
        <div className="p-8 border-b-4 border-ink flex items-center justify-between bg-paper">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowHistory(false)}
              className="p-2 bg-white border-2 border-ink shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
              title="Close Archives"
            >
              <X size={20} strokeWidth={3} />
            </button>
            <h3 className="text-2xl font-bold uppercase tracking-widest">Archives</h3>
          </div>
          <button 
            onClick={() => setConfirmDelete({ id: 'all' })}
            className="p-3 bg-white border-4 border-ink text-red-500 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
            title="Purge All Archives"
          >
            <Trash2 size={20} strokeWidth={3} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <button 
            onClick={() => {
              setCurrentSessionId(null);
              setShowHistory(false);
            }}
            className="w-full p-6 border-4 border-ink bg-accent text-paper flex items-center gap-4 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all uppercase font-bold text-sm tracking-widest"
          >
            <Plus size={20} />
            New Intelligence
          </button>

          {sessions.map(session => (
            <div 
              key={session.id}
              onClick={() => {
                setCurrentSessionId(session.id);
                setShowHistory(false);
              }}
              className={cn(
                "group p-6 border-4 border-ink cursor-pointer transition-all relative",
                currentSessionId === session.id 
                  ? "bg-ink text-paper shadow-[-4px_4px_0px_0px_rgba(90,90,64,1)]" 
                  : "bg-white text-ink hover:bg-slate-50 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]"
              )}
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-bold uppercase truncate text-sm mb-1">{session.title}</p>
                  <p className="text-[10px] opacity-40 uppercase tracking-tighter truncate">{session.lastMessage}</p>
                </div>
                <button 
                  onClick={(e) => deleteSession(session.id, session.title, e)}
                  className="p-2 bg-white border-2 border-ink text-red-500 shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
                >
                  <Trash2 size={16} strokeWidth={3} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative">
        {/* Custom Confirmation Modal */}
        {confirmDelete && (
          <div className="fixed inset-0 bg-ink/40 backdrop-blur-md flex items-center justify-center p-12 z-[100]">
            <div className="bg-white w-full max-w-xl border-4 border-ink p-16 animate-in fade-in zoom-in-95 duration-200 shadow-[16px_16px_0px_0px_rgba(26,26,26,1)]">
              <h3 className="text-4xl font-bold text-ink mb-6 uppercase tracking-tight">Archive Intelligence?</h3>
              <p className="text-slate-500 text-lg mb-12 leading-relaxed font-bold uppercase tracking-widest">
                {confirmDelete.id === 'all' 
                  ? "ALL INTELLIGENCE SESSIONS WILL BE PURGED FROM THE ARCHIVES. THIS ACTION IS IRREVERSIBLE."
                  : `THE SESSION "${confirmDelete.title}" WILL BE PURGED. THIS ACTION IS IRREVERSIBLE.`
                }
              </p>
              <div className="flex gap-6">
                <button 
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 px-8 py-5 bg-slate-100 text-slate-400 border-4 border-ink hover:bg-slate-200 transition-all font-bold text-sm uppercase tracking-widest"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    if (confirmDelete.id === 'all') {
                      clearAllHistory();
                    } else {
                      executeDeleteSession(confirmDelete.id);
                    }
                  }}
                  className="flex-1 px-8 py-5 bg-red-500 text-white border-4 border-ink hover:bg-red-600 transition-all font-bold text-sm uppercase tracking-widest shadow-[8px_8px_0px_0px_rgba(26,26,26,1)] active:shadow-none active:translate-x-1 active:translate-y-1"
                >
                  Archive
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header with History Toggle */}
        <div className="absolute top-8 right-8 z-30">
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className={cn(
              "p-6 border-4 border-ink shadow-[8px_8px_0px_0px_rgba(26,26,26,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all duration-200",
              showHistory ? "bg-accent text-paper" : "bg-white text-ink"
            )}
          >
            <Clock size={28} strokeWidth={2} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-16 space-y-16 relative z-10" ref={scrollRef}>
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-10 opacity-60">
              <div className="w-32 h-32 bg-white border-4 border-ink flex items-center justify-center shadow-[8px_8px_0px_0px_rgba(26,26,26,1)] animate-pulse">
                <Sparkles className="text-accent" size={60} strokeWidth={2} />
              </div>
              <div className="space-y-6">
                <h3 className="text-6xl font-bold text-ink uppercase tracking-tight">Intelligence Assistant</h3>
                <p className="text-slate-400 max-w-md mx-auto text-xl font-bold uppercase tracking-widest">Awaiting your inquiry into the intelligence base.</p>
              </div>
            </div>
          )}
          
          {messages.map((msg) => (
            <div key={msg.id} className={cn(
              "flex w-full animate-in slide-in-from-bottom-8 duration-500",
              msg.role === 'user' ? "justify-end" : "justify-start"
            )}>
              <div className="flex flex-col gap-6 max-w-[80%]">
                <div className={cn(
                  "p-10 border-4 border-ink transition-all duration-300",
                  msg.role === 'user' 
                    ? "bg-ink text-paper shadow-[-8px_8px_0px_0px_rgba(90,90,64,1)]" 
                    : "bg-white text-ink shadow-[8px_8px_0px_0px_rgba(26,26,26,1)]"
                )}>
                  <div className="flex-shrink-0 mb-4 flex items-center gap-4">
                    {msg.role === 'user' ? <User size={24} strokeWidth={2} /> : <Bot size={24} strokeWidth={2} className="text-accent" />}
                    <span className="text-xs font-bold uppercase tracking-widest opacity-40">
                      {msg.role === 'user' ? 'Operator' : 'AI Core'}
                    </span>
                  </div>
                  <div className={cn(
                    "prose prose-lg max-w-none font-bold leading-relaxed uppercase",
                    msg.role === 'user' ? "prose-invert" : "prose-slate"
                  )}>
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start animate-pulse">
              <div className="bg-white border-4 border-ink p-8 flex items-center gap-6 text-slate-400 shadow-[8px_8px_0px_0px_rgba(26,26,26,1)]">
                <Loader2 className="animate-spin" size={24} strokeWidth={2} />
                <span className="text-lg font-bold uppercase tracking-[0.4em]">Synthesizing Intelligence...</span>
              </div>
            </div>
          )}
        </div>

        <div className="p-16 relative z-10">
          <form onSubmit={handleSend} className="max-w-5xl mx-auto flex gap-6 bg-white p-4 border-4 border-ink shadow-[12px_12px_0px_0px_rgba(26,26,26,1)] focus-within:shadow-[16px_16px_0px_0px_rgba(26,26,26,1)] transition-all duration-300">
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Inquire about the intelligence base..."
              className="flex-1 bg-transparent border-none outline-none px-8 py-6 text-ink placeholder:text-slate-300 text-2xl font-bold uppercase"
            />
            <button 
              disabled={!input.trim() || isLoading}
              className="bg-ink text-paper p-6 border-4 border-ink hover:bg-accent hover:border-accent active:translate-x-1 active:translate-y-1 transition-all duration-200 disabled:opacity-30"
            >
              <Send size={28} strokeWidth={2} />
            </button>
          </form>
        </div>
      </div>

      <style>{`
        .atmosphere {
          background: 
            radial-gradient(circle at 50% 0%, rgba(90, 90, 64, 0.03) 0%, transparent 50%),
            radial-gradient(circle at 100% 100%, rgba(90, 90, 64, 0.02) 0%, transparent 50%);
          opacity: 1;
        }
        .prose p { margin-top: 0; margin-bottom: 0.75rem; }
        .prose p:last-child { margin-bottom: 0; }
      `}</style>
    </div>
  );
}
