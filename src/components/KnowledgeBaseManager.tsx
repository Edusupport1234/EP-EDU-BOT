import React, { useState, useEffect, useRef } from 'react';
import { db, collection, query, where, orderBy, onSnapshot, setDoc, doc, deleteDoc, auth } from '../firebase';
import { KnowledgeChunk } from '../types';
import { Plus, Trash2, Edit2, Search, X, Save, FileText, Upload, Loader2, ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';
import { GoogleGenAI } from "@google/genai";

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

const DEFAULT_CATEGORIES = ['CFF', 'Schedule', 'Policy', 'General'];

export default function KnowledgeBaseManager({ userId }: Props) {
  const [chunks, setChunks] = useState<KnowledgeChunk[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingChunk, setEditingChunk] = useState<KnowledgeChunk | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionStatus, setExtractionStatus] = useState<string>('Extracting...');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({ 'CFF': true, 'Schedule': true });
  
  const [formData, setFormData] = useState({ 
    title: '', 
    content: '', 
    summary: '',
    category: 'General',
    tags: '',
    fileType: '',
    fileName: '',
    imageData: ''
  });

  const [confirmDelete, setConfirmDelete] = useState<{ type: 'chunk' | 'category', id?: string, name?: string, count?: number } | null>(null);
  const [hiddenCategories, setHiddenCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem(`hidden_cats_${userId}`);
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem(`hidden_cats_${userId}`, JSON.stringify(hiddenCategories));
  }, [hiddenCategories, userId]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredChunks = chunks.filter(chunk => 
    chunk.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chunk.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chunk.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chunk.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const groupedChunks = filteredChunks.reduce((acc, chunk) => {
    const cat = chunk.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(chunk);
    return acc;
  }, {} as Record<string, KnowledgeChunk[]>);

  const allCategories = Array.from(new Set([...DEFAULT_CATEGORIES, ...Object.keys(groupedChunks)]))
    .filter(cat => !hiddenCategories.includes(cat));

  useEffect(() => {
    const q = query(
      collection(db, 'knowledgeChunks'),
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as KnowledgeChunk);
      setChunks(data);
    });

    return () => unsubscribe();
  }, [userId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    setExtractionStatus('Resizing image...');
    try {
      const resizeImage = (file: File): Promise<string> => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              let width = img.width;
              let height = img.height;
              const maxDim = 1024;

              if (width > height && width > maxDim) {
                height *= maxDim / width;
                width = maxDim;
              } else if (height > maxDim) {
                width *= maxDim / height;
                height = maxDim;
              }

              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx?.drawImage(img, 0, 0, width, height);
              resolve(canvas.toDataURL('image/jpeg', 0.7).split(',')[1]);
            };
            img.src = e.target?.result as string;
          };
          reader.readAsDataURL(file);
        });
      };

      let base64Data: string;
      if (file.type.startsWith('image/')) {
        base64Data = await resizeImage(file);
      } else {
        setExtractionStatus('Reading file...');
        const reader = new FileReader();
        base64Data = await new Promise((resolve) => {
          reader.onload = (e) => resolve((e.target?.result as string).split(',')[1]);
          reader.readAsDataURL(file);
        });
      }

      const apiKey = process.env.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Gemini API key not found. Please set GEMINI_API_KEY or VITE_GEMINI_API_KEY.");
      }
      
      const ai = new GoogleGenAI({ apiKey });
      
      setExtractionStatus('Analyzing with AI...');
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { inlineData: { data: base64Data, mimeType: file.type.startsWith('image/') ? 'image/jpeg' : file.type } },
              { text: "Extract all the text and key information from this file. Format it clearly as a knowledge base article. Also, provide a concise 1-2 sentence summary of the content. Format your response as: ARTICLE: [article text] SUMMARY: [summary text]" }
            ]
          }
        ]
      });

      const fullText = response.text || "";
      const articleMatch = fullText.match(/ARTICLE:([\s\S]*?)(?=SUMMARY:|$)/i);
      const summaryMatch = fullText.match(/SUMMARY:([\s\S]*?)$/i);

      const extractedContent = articleMatch ? articleMatch[1].trim() : fullText;
      const extractedSummary = summaryMatch ? summaryMatch[1].trim() : "No summary available.";

      setFormData(prev => ({
        ...prev,
        title: prev.title || file.name.split('.')[0],
        content: extractedContent,
        summary: extractedSummary,
        fileType: file.type.startsWith('image/') ? 'image/jpeg' : file.type,
        fileName: file.name,
        imageData: file.type.startsWith('image/') ? `data:image/jpeg;base64,${base64Data}` : prev.imageData
      }));
    } catch (error) {
      console.error('File extraction error:', error);
      alert(error instanceof Error ? error.message : "Failed to process file. Please try a smaller file.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.content) return;

    const id = editingChunk?.id || (formData.title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || crypto.randomUUID());
    const now = Date.now();
    
    const newChunk: KnowledgeChunk = {
      id,
      title: formData.title,
      content: formData.content,
      summary: formData.summary,
      category: formData.category,
      tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
      userId,
      createdAt: editingChunk?.createdAt || now,
      updatedAt: now,
    };

    if (formData.fileType) newChunk.fileType = formData.fileType;
    if (formData.fileName) newChunk.fileName = formData.fileName;
    // imageData is removed from saving as per user request

    try {
      await setDoc(doc(db, 'knowledgeChunks', id), newChunk);
      setIsAdding(false);
      setEditingChunk(null);
      setFormData({ title: '', content: '', summary: '', category: 'General', tags: '', fileType: '', fileName: '', imageData: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `knowledgeChunks/${id}`);
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmDelete({ type: 'chunk', id });
  };

  const executeDeleteChunk = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'knowledgeChunks', id));
      setConfirmDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `knowledgeChunks/${id}`);
    }
  };

  const handleDeleteCategory = (cat: string) => {
    const allItemsInCategory = chunks.filter(c => (c.category || 'General') === cat);
    setConfirmDelete({ 
      type: 'category', 
      name: cat, 
      count: allItemsInCategory.length 
    });
  };

  const executeDeleteCategory = async (cat: string) => {
    const allItemsInCategory = chunks.filter(c => (c.category || 'General') === cat);
    
    try {
      if (allItemsInCategory.length > 0) {
        await Promise.all(allItemsInCategory.map(item => deleteDoc(doc(db, 'knowledgeChunks', item.id))));
      }
      setHiddenCategories(prev => Array.from(new Set([...prev, cat])));
      setConfirmDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `knowledgeChunks (category: ${cat})`);
    }
  };

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  return (
    <div className="flex flex-col h-full bg-paper p-12 font-pixel overflow-y-auto selection:bg-accent/10 selection:text-accent">
      <div className="flex justify-between items-end mb-16">
        <div className="space-y-4">
          <h2 className="text-7xl font-bold text-ink tracking-tight uppercase">Repository</h2>
          <p className="text-sm font-bold text-accent uppercase tracking-[0.3em] opacity-60">Curated Organizational Intelligence</p>
        </div>
        <div className="flex items-center gap-8">
          {hiddenCategories.length > 0 && (
            <button 
              onClick={() => setHiddenCategories([])}
              className="text-xs font-bold text-accent uppercase tracking-widest hover:opacity-60 transition-opacity"
            >
              Restore Hidden
            </button>
          )}
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-4 bg-ink text-paper px-10 py-5 rounded-none border-2 border-ink hover:shadow-[4px_4px_0px_0px_rgba(90,90,64,1)] active:translate-x-1 active:translate-y-1 transition-all duration-200 group"
          >
            <Plus size={24} strokeWidth={2} className="group-hover:rotate-90 transition-transform duration-500" />
            <span className="font-bold text-lg tracking-widest uppercase">New Entry</span>
          </button>
        </div>
      </div>

      <div className="relative mb-20 group">
        <Search className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-accent transition-colors" size={24} strokeWidth={2} />
        <input 
          type="text"
          placeholder="Search the intelligence base..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-6 bg-transparent border-b-4 border-ink focus:border-accent outline-none transition-all duration-500 text-2xl font-bold placeholder:text-slate-200 uppercase"
        />
      </div>

      <div className="space-y-10">
        {allCategories.map(cat => {
          const items = groupedChunks[cat] || [];
          if (items.length === 0 && searchQuery) return null;
          
          const isExpanded = expandedCategories[cat] ?? true;

          return (
            <div key={cat} className="space-y-10 group/cat">
              <div className="flex items-center justify-between border-b-2 border-ink pb-6">
                <button 
                  onClick={() => toggleCategory(cat)}
                  className="flex items-center gap-6 text-ink hover:text-accent transition-colors group"
                >
                  <div className={cn(
                    "w-10 h-10 flex items-center justify-center border-2 border-ink transition-all duration-300 group-hover:bg-accent group-hover:text-paper",
                    isExpanded ? "bg-ink text-paper" : "bg-white text-ink"
                  )}>
                    {isExpanded ? <ChevronDown size={20} strokeWidth={2} /> : <ChevronRight size={20} strokeWidth={2} />}
                  </div>
                  <h3 className="text-lg font-bold uppercase tracking-[0.4em] flex items-center gap-6">
                    {cat}
                    <span className="text-sm opacity-40">[{items.length}]</span>
                  </h3>
                </button>
                
                <button 
                  onClick={() => handleDeleteCategory(cat)}
                  className="opacity-0 group-hover/cat:opacity-100 p-2 text-slate-300 hover:text-red-500 transition-all text-xs font-bold uppercase tracking-widest"
                >
                  Archive Category
                </button>
              </div>

              {isExpanded && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                  {items.map(chunk => (
                    <div key={chunk.id} className="bougie-card p-10 group relative flex flex-col h-full">
                      <div className="absolute top-8 right-8 flex gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300">
                        <button 
                          onClick={() => {
                            setEditingChunk(chunk);
                            setFormData({ 
                              title: chunk.title, 
                              content: chunk.content, 
                              summary: chunk.summary || '',
                              category: chunk.category || 'General',
                              tags: chunk.tags.join(', '),
                              fileType: chunk.fileType || '',
                              fileName: chunk.fileName || '',
                              imageData: chunk.imageData || ''
                            });
                            setIsAdding(true);
                          }}
                          className="p-3 bg-white border-2 border-ink text-ink hover:bg-accent hover:text-paper transition-all"
                        >
                          <Edit2 size={18} strokeWidth={2} />
                        </button>
                        <button 
                          onClick={() => handleDelete(chunk.id)}
                          className="p-3 bg-white border-2 border-ink text-ink hover:bg-red-500 hover:text-paper transition-all"
                        >
                          <Trash2 size={18} strokeWidth={2} />
                        </button>
                      </div>

                      <div className="mb-10">
                        <h4 className="text-3xl font-bold text-ink mb-4 leading-tight uppercase">{chunk.title}</h4>
                        <div className="flex items-center gap-4 text-xs text-accent font-bold uppercase tracking-widest opacity-60">
                          <FileText size={14} strokeWidth={2} />
                          <span>{new Date(chunk.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                      </div>

                      {chunk.summary && (
                        <div className="mb-10 p-6 bg-accent/5 border-l-4 border-accent">
                          <p className="text-base text-slate-600 font-bold leading-relaxed uppercase">
                            {chunk.summary}
                          </p>
                        </div>
                      )}

                      <p className="text-slate-500 text-lg line-clamp-4 mb-10 leading-relaxed flex-grow">
                        {chunk.content}
                      </p>

                      <div className="flex flex-wrap gap-3 mt-auto">
                        {chunk.tags.map(tag => (
                          <span key={tag} className="text-xs font-bold text-ink uppercase tracking-widest bg-paper border-2 border-ink px-4 py-1.5">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && !searchQuery && (
                    <div className="col-span-full py-10 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 text-sm">
                      No entries found in this category.
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-md flex items-center justify-center p-12 z-50">
          <div className="bg-white w-full max-w-4xl border-4 border-ink p-16 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto relative">
            <button onClick={() => { setIsAdding(false); setEditingChunk(null); }} className="absolute top-12 right-12 p-4 text-slate-300 hover:text-ink transition-colors">
              <X size={36} strokeWidth={2} />
            </button>

            <div className="mb-16">
              <h3 className="text-5xl font-bold text-ink mb-4 uppercase tracking-tight">{editingChunk ? 'Refine Entry' : 'New Intelligence'}</h3>
              <p className="text-sm font-bold text-accent uppercase tracking-[0.3em] opacity-60">Intelligence Acquisition Protocol</p>
            </div>

            <form onSubmit={handleSave} className="space-y-12">
              <div className="grid grid-cols-2 gap-16">
                <div className="space-y-4">
                  <label className="text-xs font-bold text-ink uppercase tracking-widest opacity-60">Category</label>
                  <select 
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-transparent border-b-4 border-ink py-4 focus:border-accent outline-none transition-all duration-300 text-lg font-bold appearance-none cursor-pointer uppercase"
                  >
                    {allCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="custom">+ Create New...</option>
                  </select>
                  {formData.category === 'custom' && (
                    <input 
                      type="text"
                      placeholder="Define category name..."
                      className="w-full mt-6 minimal-input uppercase"
                      onBlur={(e) => {
                        if (e.target.value) {
                          setFormData({ ...formData, category: e.target.value });
                        } else {
                          setFormData({ ...formData, category: 'General' });
                        }
                      }}
                    />
                  )}
                </div>
                <div className="space-y-4">
                  <label className="text-xs font-bold text-ink uppercase tracking-widest opacity-60">Title</label>
                  <input 
                    required
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full minimal-input uppercase"
                    placeholder="e.g. Strategic Directive 01"
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex justify-between items-end">
                  <label className="text-xs font-bold text-ink uppercase tracking-widest opacity-60">Intelligence Content</label>
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isExtracting}
                    className="flex items-center gap-3 text-xs font-bold text-accent hover:opacity-60 transition-all disabled:opacity-30 uppercase tracking-widest"
                  >
                    {isExtracting ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} strokeWidth={3} />}
                    {isExtracting ? extractionStatus : 'Ingest Document'}
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*,application/pdf,text/*"
                    onChange={handleFileUpload}
                  />
                </div>
                <textarea 
                  required
                  rows={6}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full p-8 bg-slate-50 border-2 border-ink focus:border-accent outline-none resize-none text-lg leading-relaxed transition-all duration-300 uppercase"
                  placeholder="The core intelligence data goes here..."
                />
              </div>

              <div className="space-y-6">
                <label className="text-xs font-bold text-ink uppercase tracking-widest opacity-60">Executive Summary</label>
                <textarea 
                  required
                  rows={2}
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  className="w-full p-8 bg-slate-50 border-2 border-ink focus:border-accent outline-none resize-none text-lg leading-relaxed transition-all duration-300 uppercase"
                  placeholder="A refined distillation of the intelligence..."
                />
              </div>

              <div className="space-y-4">
                <label className="text-xs font-bold text-ink uppercase tracking-widest opacity-60">Classification Tags</label>
                <input 
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="w-full minimal-input uppercase"
                  placeholder="Separated by commas..."
                />
              </div>

              <button 
                type="submit"
                className="w-full flex items-center justify-center gap-4 bg-ink text-paper py-6 border-4 border-ink hover:bg-accent hover:border-accent active:translate-x-1 active:translate-y-1 transition-all duration-200 font-bold text-xl uppercase tracking-[0.2em] mt-12"
              >
                <Save size={24} strokeWidth={2} />
                <span>{editingChunk ? 'Commit Changes' : 'Commit to Repository'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-md flex items-center justify-center p-12 z-[60]">
          <div className="bg-white w-full max-w-xl border-4 border-ink p-16 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-4xl font-bold text-ink mb-6 uppercase">Archive Intelligence?</h3>
            <p className="text-slate-500 text-lg mb-12 leading-relaxed font-bold uppercase">
              {confirmDelete.type === 'chunk' 
                ? "This intelligence will be purged from the active repository. This action is irreversible."
                : `The "${confirmDelete.name}" classification will be archived. ${confirmDelete.count && confirmDelete.count > 0 ? `This will purge ALL ${confirmDelete.count} associated intelligence entries.` : "This classification is currently vacant."}`
              }
            </p>
            <div className="flex gap-6">
              <button 
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-8 py-5 bg-slate-100 text-slate-400 border-2 border-transparent hover:border-ink transition-all font-bold text-sm uppercase tracking-widest"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (confirmDelete.type === 'chunk' && confirmDelete.id) {
                    executeDeleteChunk(confirmDelete.id);
                  } else if (confirmDelete.type === 'category' && confirmDelete.name) {
                    executeDeleteCategory(confirmDelete.name);
                  }
                }}
                className="flex-1 px-8 py-5 bg-red-500 text-white border-2 border-ink hover:bg-red-600 transition-all font-bold text-sm uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]"
              >
                Archive
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
