import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { db, collection, query, where, onSnapshot, auth, setDoc, doc, deleteDoc, getDocs, orderBy, limit, addDoc, writeBatch } from '../firebase';
import { KnowledgeChunk, ChatMessage, ChatSession } from '../types';
import { Send, Bot, User, Loader2, Sparkles, Menu, Trash2, Plus, MessageSquare, X, Database, Search, Edit2, Check, Calendar as CalendarIcon, Clock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';
import { useLanguage } from '../contexts/LanguageContext';

interface Props {
  userId: string;
  onNavigateToSource: (chunkId: string) => void;
  onProposeEvent: (eventData: any) => void;
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

function ScheduleCard({ data, userId, onProposeEvent }: { data: { events: any[] }, userId: string, onProposeEvent: (data: any) => void }) {
  const { t } = useLanguage();
  const [added, setAdded] = useState(false);

  const handleAddToCalendar = async () => {
    try {
      const batch = writeBatch(db);
      data.events.forEach(event => {
        const eventRef = doc(collection(db, 'calendarEvents'));
        batch.set(eventRef, {
          userId,
          title: event.title,
          description: event.description || '',
          startTime: new Date(event.startTime).getTime(),
          endTime: new Date(event.endTime).getTime(),
          createdAt: Date.now(),
          color: '#ff3333'
        });
      });
      await batch.commit();
      setAdded(true);
    } catch (error) {
      console.error("Error adding schedule to calendar:", error);
    }
  };

  return (
    <div className="my-10 border-4 border-ink shadow-[8px_8px_0px_0px_var(--color-shadow)] overflow-hidden bg-paper p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-accent">
          <CalendarIcon size={24} strokeWidth={3} />
          <h4 className="text-xl font-bold tracking-widest uppercase">{t('schedule')}</h4>
        </div>
      </div>
      
      <div className="space-y-4">
        {data.events.map((event, idx) => (
          <div key={idx} className="p-6 bg-card-bg border-2 border-ink flex items-start gap-6 group relative">
            <div className="flex flex-col items-center justify-center min-w-[80px] py-2 bg-ink text-paper text-xs font-bold tracking-widest">
              <Clock size={14} className="mb-1" />
              {new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
            </div>
            <div className="flex-1">
              <h5 className="font-bold text-ink mb-1">{event.title}</h5>
              <p className="text-xs text-ink-muted font-medium">{event.description}</p>
            </div>
            <button 
              onClick={() => onProposeEvent(event)}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-accent text-paper opacity-0 group-hover:opacity-100 transition-all shadow-[4px_4px_0px_0px_var(--color-shadow)] hover:shadow-none"
              title="Open in Calendar"
            >
              <Plus size={16} strokeWidth={3} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-4">
        <button 
          onClick={handleAddToCalendar}
          disabled={added}
          className={cn(
            "flex-1 flex items-center justify-center gap-4 px-8 py-4 border-4 border-ink font-bold tracking-widest transition-all",
            added 
              ? "bg-green-500 text-white cursor-default" 
              : "bg-accent text-paper shadow-[4px_4px_0px_0px_var(--color-shadow)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5"
          )}
        >
          {added ? <Check size={20} strokeWidth={3} /> : <Plus size={20} strokeWidth={3} />}
          {added ? t('addedToCalendar') : t('addAllToCalendar')}
        </button>
      </div>
    </div>
  );
}

function ProposeEventCard({ data, onProposeEvent }: { data: any, onProposeEvent: (data: any) => void }) {
  const { t } = useLanguage();
  return (
    <div className="my-10 border-4 border-ink shadow-[8px_8px_0px_0px_var(--color-shadow)] overflow-hidden bg-paper p-8 space-y-6">
      <div className="flex items-center gap-4 text-accent">
        <CalendarIcon size={24} strokeWidth={3} />
        <h4 className="text-xl font-bold tracking-widest uppercase">{t('eventProposal')}</h4>
      </div>
      <div className="p-6 bg-card-bg border-2 border-ink">
        <h5 className="font-bold text-ink mb-2 text-xl">{data.title}</h5>
        <div className="flex items-center gap-3 text-accent mb-4">
          <Clock size={16} strokeWidth={3} />
          <span className="text-xs font-bold tracking-widest">
            {new Date(data.startTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
          </span>
        </div>
        <p className="text-sm text-ink-muted font-medium leading-relaxed">{data.description}</p>
      </div>
      <button 
        onClick={() => onProposeEvent(data)}
        className="w-full flex items-center justify-center gap-4 px-8 py-4 bg-accent text-paper border-4 border-ink font-bold tracking-widest shadow-[4px_4px_0px_0px_var(--color-shadow)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
      >
        <Plus size={20} strokeWidth={3} />
        {t('reviewInCalendar')}
      </button>
    </div>
  );
}

export default function Chatbot({ userId, onNavigateToSource, onProposeEvent }: Props) {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [knowledge, setKnowledge] = useState<KnowledgeChunk[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [archiveSearch, setArchiveSearch] = useState('');
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null);
  const [renamingTitle, setRenamingTitle] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<{ id: string | 'all', title?: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const suggestions = React.useMemo(() => {
    if (knowledge.length === 0) return [];
    
    // Prioritize favorites, then recent
    const favorites = knowledge.filter(k => k.isFavorite);
    const others = knowledge.filter(k => !k.isFavorite);
    
    const pool = [...favorites, ...others];
    // Pick 4 unique ones randomly
    const selected = pool.sort(() => Math.random() - 0.5).slice(0, 4);
    
    return selected.map(k => ({
      id: k.id,
      title: k.title,
      category: k.category,
      prompt: `${t('tellMeMoreAbout')} ${k.title}`
    }));
  }, [knowledge]);

  // Load Knowledge Base
  useEffect(() => {
    const q = query(collection(db, 'knowledgeChunks'), where('userId', '==', userId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setKnowledge(snapshot.docs.map(doc => doc.data() as KnowledgeChunk));
    }, (error: any) => {
      if (error.message?.includes('resource-exhausted') || error.message?.includes('Quota exceeded')) {
        console.warn("Firestore quota exceeded for knowledge base.");
      } else {
        handleFirestoreError(error, OperationType.LIST, 'knowledgeChunks');
      }
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
    }, (error: any) => {
      if (error.message?.includes('resource-exhausted') || error.message?.includes('Quota exceeded')) {
        console.warn("Firestore quota exceeded for chat sessions.");
      } else {
        handleFirestoreError(error, OperationType.LIST, 'chatSessions');
      }
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
    }, (error: any) => {
      if (error.message?.includes('resource-exhausted') || error.message?.includes('Quota exceeded')) {
        console.warn("Firestore quota exceeded for messages.");
      } else {
        handleFirestoreError(error, OperationType.LIST, `chatSessions/${currentSessionId}/messages`);
      }
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

  const executeRenameSession = async (id: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    try {
      await setDoc(doc(db, 'chatSessions', id), { 
        title: newTitle,
        updatedAt: Date.now()
      }, { merge: true });
      setRenamingSessionId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `chatSessions/${id}`);
    }
  };

  const filteredSessions = sessions.filter(s => 
    s.title.toLowerCase().includes(archiveSearch.toLowerCase()) ||
    s.lastMessage.toLowerCase().includes(archiveSearch.toLowerCase())
  );

  const deleteSession = (sessionId: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDelete({ id: sessionId, title });
  };

  const handleSend = async (e?: React.FormEvent, overrideInput?: string) => {
    if (e) e.preventDefault();
    const messageContent = overrideInput || input;
    if (!messageContent.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: messageContent,
      timestamp: Date.now(),
    };

    let sessionId = currentSessionId;
    if (!sessionId) {
      sessionId = await createNewSession(messageContent);
    }

    if (!sessionId) return;

    setMessages(prev => [...prev, userMessage]);
    if (!overrideInput) setInput('');
    setIsLoading(true);

    // Save user message
    await saveMessage(sessionId, userMessage);

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Gemini API key not found. Please ensure GEMINI_API_KEY is set.");
      }
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [{ text: `
              You are a helpful AI assistant. Answer the user's question based ONLY on the provided knowledge base below.
              The knowledge base contains articles, summaries, and transcriptions from audio/video files.
              If the answer is not in the knowledge base, politely inform the user that you don't have that information yet.
              
              KNOWLEDGE BASE:
              ${knowledge.map(k => `--- ID: ${k.id} | ${k.category}: ${k.title} ---\nSUMMARY: ${k.summary}\nCONTENT: ${k.content}\nIMAGE_AVAILABLE: ${k.imageData ? 'YES' : 'NO'}\nMEDIA_AVAILABLE: ${k.mediaUrl ? 'YES' : 'NO'} (${k.mediaType})`).join('\n\n')}
              
              USER QUESTION:
              ${messageContent}
              
              INSTRUCTIONS:
              1. Answer based ONLY on the knowledge base.
              2. Use the SUMMARY to quickly identify context and the CONTENT for detailed answers.
              3. If the information comes from a transcription, mention that it was extracted from a media file.
              4. If the user asks for an image, or if the information you are providing is best represented by an image that is available (IMAGE_AVAILABLE: YES), you MUST include the tag [IMAGE:chunk_id] in your response where chunk_id is the ID provided in the knowledge base.
              5. If the information you are providing is best represented by a media file (audio or video) that is available (MEDIA_AVAILABLE: YES), you MUST include the tag [MEDIA:chunk_id] in your response where chunk_id is the ID provided in the knowledge base.
              6. If you are proposing a schedule or daily plan based on the intelligence, you MUST include a JSON block in the format: [SCHEDULE:{"events":[{"title":"...","startTime":"ISO_DATETIME","endTime":"ISO_DATETIME","description":"..."}]}]
              7. If you are proposing a single event to be added to the calendar, use the format: [PROPOSE_EVENT:{"title":"...","startTime":"ISO_DATETIME","endTime":"ISO_DATETIME","description":"..."}]. In the description, provide a concise summary of the event context from the knowledge base.
              8. At the end of your response, if you used information from the knowledge base, you MUST list the sources used in the format: [SOURCE:chunk_id] for each relevant entry.
              9. The current local time is: ${new Date().toLocaleString()}. Use this as a reference for scheduling.
            ` }]
        },
        config: {
          systemInstruction: "You are a precise AI assistant that strictly follows the provided knowledge context. Keep answers concise and professional. Use normal sentence case (do not use all capital letters). When referencing available images, always use the [IMAGE:id] format. When referencing available media (audio/video), always use the [MEDIA:id] format. Always cite your sources using the [SOURCE:id] format at the end of your response. If you propose a schedule or event, use the [SCHEDULE:json] or [PROPOSE_EVENT:json] format and ask the user if they would like to add it to their calendar.",
        }
      });

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
        "fixed inset-y-0 right-0 w-96 bg-card-bg border-l-4 border-ink z-40 transition-transform duration-300 shadow-[-12px_0px_0px_0px_rgba(26,26,26,0.1)] flex flex-col",
        showHistory ? "translate-x-0" : "translate-x-full"
      )}>
        <div className="p-8 border-b-2 border-ink flex items-center justify-between bg-paper">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowHistory(false)}
              className="p-2 text-ink hover:text-accent transition-all"
              title="Close Archives"
            >
              <X size={20} strokeWidth={3} />
            </button>
            <h3 className="text-2xl font-bold tracking-widest">{t('archives')}</h3>
          </div>
          <button 
            onClick={() => setConfirmDelete({ id: 'all' })}
            className="p-2 text-red-500 hover:text-red-700 transition-all"
            title={t('purge')}
          >
            <Trash2 size={20} strokeWidth={3} />
          </button>
        </div>

        <div className="p-6 border-b-2 border-ink bg-paper/50">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/40" size={16} />
            <input 
              type="text"
              value={archiveSearch}
              onChange={(e) => setArchiveSearch(e.target.value)}
              placeholder={t('searchArchives')}
              className="w-full pl-12 pr-4 py-3 bg-paper border-2 border-ink focus:border-accent outline-none text-sm font-bold tracking-widest"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <button 
            onClick={() => {
              setCurrentSessionId(null);
              setShowHistory(false);
            }}
            className="w-full p-6 border-4 border-ink bg-accent text-paper flex items-center gap-4 shadow-[4px_4px_0px_0px_var(--color-shadow)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all font-bold text-sm tracking-widest"
          >
            <Plus size={20} />
            {t('newIntelligence')}
          </button>

          {filteredSessions.map(session => (
            <div 
              key={session.id}
              onClick={() => {
                if (renamingSessionId !== session.id) {
                  setCurrentSessionId(session.id);
                  setShowHistory(false);
                }
              }}
              className={cn(
                "group p-6 border-4 border-ink cursor-pointer transition-all relative",
                currentSessionId === session.id 
                  ? "bg-ink text-paper shadow-[-4px_4px_0px_0px_rgba(90,90,64,1)]" 
                  : "bg-card-bg text-ink hover:bg-paper shadow-[4px_4px_0px_0px_var(--color-shadow)]"
              )}
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  {renamingSessionId === session.id ? (
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <input 
                        autoFocus
                        type="text"
                        value={renamingTitle}
                        onChange={e => setRenamingTitle(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') executeRenameSession(session.id, renamingTitle);
                          if (e.key === 'Escape') setRenamingSessionId(null);
                        }}
                        className="flex-1 bg-paper text-ink border-2 border-accent px-2 py-1 text-sm font-bold outline-none"
                      />
                      <button 
                        onClick={() => executeRenameSession(session.id, renamingTitle)}
                        className="p-1 text-accent hover:scale-110 transition-all"
                      >
                        <Check size={16} strokeWidth={3} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="font-bold truncate text-sm mb-1">{session.title}</p>
                      <p className="text-[10px] opacity-40 tracking-tighter truncate">{session.lastMessage}</p>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setRenamingSessionId(session.id);
                      setRenamingTitle(session.title);
                    }}
                    className="p-2 text-accent hover:scale-110 transition-all"
                    title="Rename"
                  >
                    <Edit2 size={16} strokeWidth={3} />
                  </button>
                  <button 
                    onClick={(e) => deleteSession(session.id, session.title, e)}
                    className="p-2 text-red-500 hover:text-red-700 transition-all"
                    title="Delete"
                  >
                    <Trash2 size={16} strokeWidth={3} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {filteredSessions.length === 0 && (
            <div className="text-center py-12 opacity-40">
              <Search size={48} className="mx-auto mb-4 opacity-20" />
              <p className="font-bold tracking-widest text-xs">{t('noArchivesFound')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative">
        {/* Custom Confirmation Modal */}
        {confirmDelete && (
          <div className="fixed inset-0 bg-ink/40 backdrop-blur-md flex items-center justify-center p-12 z-[100]">
            <div className="bg-card-bg w-full max-w-xl border-4 border-ink p-16 animate-in fade-in zoom-in-95 duration-200 shadow-[16px_16px_0px_0px_var(--color-shadow)]">
              <h3 className="text-4xl font-bold text-ink mb-6 tracking-tight">{t('archiveIntelligence')}</h3>
              <p className="text-ink-muted text-lg mb-12 leading-relaxed font-bold tracking-widest">
                {confirmDelete.id === 'all' 
                  ? t('purgeAllArchives')
                  : t('purgeSession')
                }
              </p>
              <div className="flex gap-6">
                <button 
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 px-8 py-5 bg-paper text-ink-muted border-4 border-ink hover:bg-slate-200 transition-all font-bold text-sm tracking-widest"
                >
                  {t('cancel')}
                </button>
                <button 
                  onClick={() => {
                    if (confirmDelete.id === 'all') {
                      clearAllHistory();
                    } else {
                      executeDeleteSession(confirmDelete.id);
                    }
                  }}
                  className="flex-1 px-8 py-5 bg-red-500 text-white border-4 border-ink hover:bg-red-600 transition-all font-bold text-sm tracking-widest shadow-[8px_8px_0px_0px_var(--color-shadow)] active:shadow-none active:translate-x-1 active:translate-y-1"
                >
                  {t('archive')}
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
              "p-2 transition-all duration-300 hover:scale-110 active:scale-95",
              showHistory ? "text-accent" : "text-ink/70 hover:text-accent"
            )}
            title="Archives"
          >
            <Menu size={32} strokeWidth={2.5} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-16 space-y-16 relative z-10" ref={scrollRef}>
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-12 opacity-80">
              <div className="space-y-10 flex flex-col items-center">
                <Sparkles className="text-accent animate-pulse" size={100} strokeWidth={1.5} />
                <div className="space-y-6">
                  <h3 className="text-6xl font-bold text-ink tracking-tight">{t('intelligenceAssistant')}</h3>
                  <p className="text-ink-muted max-w-md mx-auto text-xl font-bold tracking-widest">{t('awaitingInquiry')}</p>
                </div>
              </div>

              {suggestions.length > 0 && (
                <div className="flex flex-wrap justify-center gap-3 max-w-3xl animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
                  {suggestions.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => handleSend(undefined, s.prompt)}
                      className="px-6 py-2.5 bg-card-bg border-2 border-ink rounded-full text-[11px] font-bold tracking-widest text-ink hover:bg-accent hover:text-paper hover:border-accent transition-all duration-300 shadow-[4px_4px_0px_0px_var(--color-shadow)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 whitespace-nowrap"
                    >
                      {s.title}
                    </button>
                  ))}
                </div>
              )}
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
                    ? "bg-ink text-paper shadow-[-8px_8px_0px_0px_var(--color-accent)]" 
                    : "bg-card-bg text-ink shadow-[8px_8px_0px_0px_var(--color-shadow)]"
                )}>
                  <div className="flex-shrink-0 mb-4 flex items-center gap-4">
                    {msg.role === 'user' ? <User size={24} strokeWidth={2} /> : <Bot size={24} strokeWidth={2} className="text-accent" />}
                    <span className="text-xs font-bold tracking-widest opacity-70">
                      {msg.role === 'user' ? t('operator') : t('aiCore')}
                    </span>
                  </div>
                  <div className={cn(
                    "prose prose-lg max-w-none font-bold leading-relaxed",
                    msg.role === 'user' ? "prose-invert" : "prose-slate"
                  )}>
                    {msg.content.split(/(\[IMAGE:[^\]]+\]|\[MEDIA:[^\]]+\]|\[SOURCE:[^\]]+\]|\[SCHEDULE:[^\]]+\]|\[PROPOSE_EVENT:[^\]]+\])/g).map((part, index) => {
                      const imageMatch = part.match(/\[IMAGE:([^\]]+)\]/);
                      const mediaMatch = part.match(/\[MEDIA:([^\]]+)\]/);
                      const sourceMatch = part.match(/\[SOURCE:([^\]]+)\]/);
                      const scheduleMatch = part.match(/\[SCHEDULE:([^\]]+)\]/);
                      const proposeEventMatch = part.match(/\[PROPOSE_EVENT:([^\]]+)\]/);

                      if (imageMatch) {
                        const chunkId = imageMatch[1];
                        const chunk = knowledge.find(k => k.id === chunkId);
                        if (chunk?.imageData) {
                          return (
                            <div key={index} className="my-10 border-4 border-ink shadow-[8px_8px_0px_0px_var(--color-shadow)] overflow-hidden bg-card-bg">
                              <img 
                                src={chunk.imageData} 
                                alt={chunk.title} 
                                className="w-full h-auto grayscale hover:grayscale-0 transition-all duration-500"
                                referrerPolicy="no-referrer"
                              />
                              <div className="bg-ink text-paper p-6 text-sm font-bold tracking-widest border-t-4 border-ink">
                                {t('intelligenceVisualization')} {chunk.title}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }

                      if (mediaMatch) {
                        const chunkId = mediaMatch[1];
                        const chunk = knowledge.find(k => k.id === chunkId);
                        if (chunk?.mediaUrl) {
                          return (
                            <div key={index} className="my-10 border-4 border-ink shadow-[8px_8px_0px_0px_var(--color-shadow)] overflow-hidden bg-card-bg p-6">
                              <div className="text-xs font-bold tracking-widest mb-4 opacity-70 flex items-center gap-2">
                                <Database size={12} />
                                {t('mediaIntelligence')} {chunk.title}
                              </div>
                              {chunk.mediaType === 'audio' ? (
                                <audio src={chunk.mediaUrl} controls className="w-full" />
                              ) : (
                                <video src={chunk.mediaUrl} controls className="w-full h-auto" />
                              )}
                            </div>
                          );
                        }
                        return null;
                      }

                      if (scheduleMatch) {
                        try {
                          const scheduleData = JSON.parse(scheduleMatch[1]);
                          return <ScheduleCard key={index} data={scheduleData} userId={userId} onProposeEvent={onProposeEvent} />;
                        } catch (e) {
                          console.error("Error parsing schedule JSON:", e);
                          return null;
                        }
                      }

                      if (proposeEventMatch) {
                        try {
                          const eventData = JSON.parse(proposeEventMatch[1]);
                          return <ProposeEventCard key={index} data={eventData} onProposeEvent={onProposeEvent} />;
                        } catch (e) {
                          console.error("Error parsing propose event JSON:", e);
                          return null;
                        }
                      }

                      if (sourceMatch) {
                        const chunkId = sourceMatch[1];
                        const chunk = knowledge.find(k => k.id === chunkId);
                        if (chunk) {
                          return (
                            <button
                              key={index}
                              onClick={() => onNavigateToSource?.(chunkId)}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-paper border-2 border-ink text-ink hover:bg-accent hover:text-paper transition-all font-bold text-xs tracking-widest my-2 mr-2 shadow-[4px_4px_0px_0px_var(--color-shadow)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                            >
                              <Database size={12} strokeWidth={3} />
                              {t('source')} {chunk.title}
                            </button>
                          );
                        }
                        return null;
                      }

                      return <ReactMarkdown key={index}>{part}</ReactMarkdown>;
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start animate-pulse">
              <div className="bg-card-bg border-4 border-ink p-8 flex items-center gap-6 text-ink-muted shadow-[8px_8px_0px_0px_var(--color-shadow)]">
                <Loader2 className="animate-spin" size={24} strokeWidth={2} />
                <span className="text-lg font-bold tracking-widest">{t('synthesizingIntelligence')}</span>
              </div>
            </div>
          )}
        </div>

        <div className="p-8 relative z-10">
          <form onSubmit={handleSend} className="max-w-4xl mx-auto flex items-center gap-4 bg-card-bg p-2 border-4 border-ink shadow-[8px_8px_0px_0px_var(--color-shadow)] focus-within:shadow-[12px_12px_0px_0px_var(--color-shadow)] transition-all duration-300">
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('inquirePlaceholder')}
              className="flex-1 bg-transparent border-none outline-none px-4 py-3 text-ink placeholder:text-ink/60 text-lg font-bold"
            />
            <button 
              disabled={!input.trim() || isLoading}
              className="p-3 text-ink hover:text-accent disabled:opacity-20 transition-all duration-300 hover:scale-110 active:scale-95"
            >
              <Send size={28} strokeWidth={2.5} />
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
