import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { db, collection, query, where, onSnapshot, auth } from '../firebase';
import { KnowledgeChunk, ChatMessage } from '../types';
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
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
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(collection(db, 'knowledgeChunks'), where('userId', '==', userId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setKnowledge(snapshot.docs.map(doc => doc.data() as KnowledgeChunk));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'knowledgeChunks');
    });
    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const model = ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            role: "user",
            parts: [{ text: `
              You are a helpful AI assistant. Answer the user's question based ONLY on the provided knowledge base below.
              If the answer is not in the knowledge base, politely inform the user that you don't have that information yet.
              
              KNOWLEDGE BASE:
              ${knowledge.map(k => `--- ${k.category}: ${k.title} ---\n${k.content}`).join('\n\n')}
              
              USER QUESTION:
              ${input}
            ` }]
          }
        ],
        config: {
          systemInstruction: "You are a precise AI assistant that strictly follows the provided knowledge context. Keep answers concise and professional.",
        }
      });

      const response = await model;
      const aiMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'model',
        content: response.text || "I'm sorry, I couldn't generate a response.",
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'model',
        content: "An error occurred while processing your request.",
        timestamp: Date.now(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden font-sans">
      {/* Immersive Background */}
      <div className="absolute inset-0 atmosphere pointer-events-none" />
      
      <div className="flex-1 overflow-y-auto p-8 space-y-8 relative z-10" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-60">
            <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center animate-pulse">
              <Sparkles className="text-indigo-600" size={40} />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-slate-900">Enterprise Assistant</h3>
              <p className="text-slate-500 max-w-sm mx-auto">I'm ready to assist you based on the organizational data in your repository.</p>
            </div>
          </div>
        )}
        
        {messages.map((msg) => (
          <div key={msg.id} className={cn(
            "flex w-full animate-in slide-in-from-bottom-2 duration-300",
            msg.role === 'user' ? "justify-end" : "justify-start"
          )}>
            <div className={cn(
              "max-w-[75%] p-5 rounded-2xl flex gap-4 shadow-sm",
              msg.role === 'user' 
                ? "bg-indigo-600 text-white rounded-tr-none" 
                : "bg-white border border-slate-200 text-slate-900 rounded-tl-none"
            )}>
              <div className="flex-shrink-0 mt-1">
                {msg.role === 'user' ? <User size={18} /> : <Bot size={18} className="text-indigo-600" />}
              </div>
              <div className={cn(
                "prose prose-sm max-w-none",
                msg.role === 'user' ? "prose-invert" : "prose-slate"
              )}>
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start animate-pulse">
            <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-none flex items-center gap-3 text-slate-400 shadow-sm">
              <Loader2 className="animate-spin" size={16} />
              <span className="text-[11px] font-bold uppercase tracking-widest">Analyzing Repository...</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-8 relative z-10">
        <form onSubmit={handleSend} className="max-w-4xl mx-auto flex gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-lg">
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about your data..."
            className="flex-1 bg-transparent border-none outline-none px-6 py-3 text-slate-900 placeholder-slate-400 text-sm"
          />
          <button 
            disabled={!input.trim() || isLoading}
            className="bg-indigo-600 text-white p-3.5 rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-sm"
          >
            <Send size={18} />
          </button>
        </form>
      </div>

      <style>{`
        .atmosphere {
          background: 
            radial-gradient(circle at 50% 0%, rgba(79, 70, 229, 0.05) 0%, transparent 50%),
            radial-gradient(circle at 100% 100%, rgba(79, 70, 229, 0.03) 0%, transparent 50%);
          opacity: 1;
        }
        .prose p { margin-top: 0; margin-bottom: 0.5rem; }
        .prose p:last-child { margin-bottom: 0; }
      `}</style>
    </div>
  );
}
