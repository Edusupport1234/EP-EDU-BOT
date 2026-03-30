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
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({ 'CFF': true, 'Schedule': true });
  
  const [formData, setFormData] = useState({ 
    title: '', 
    content: '', 
    category: 'General',
    tags: '',
    fileType: '',
    fileName: ''
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
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Data = (event.target?.result as string).split(',')[1];
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
        
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [
            {
              parts: [
                { inlineData: { data: base64Data, mimeType: file.type } },
                { text: "Extract all the text and key information from this file. Format it clearly as a knowledge base article. Do not include any conversational filler." }
              ]
            }
          ]
        });

        setFormData(prev => ({
          ...prev,
          title: prev.title || file.name.split('.')[0],
          content: response.text || "Failed to extract text.",
          fileType: file.type,
          fileName: file.name
        }));
        setIsExtracting(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('File extraction error:', error);
      setIsExtracting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.content) return;

    const id = editingChunk?.id || crypto.randomUUID();
    const now = Date.now();
    
    const newChunk: KnowledgeChunk = {
      id,
      title: formData.title,
      content: formData.content,
      category: formData.category,
      tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
      userId,
      createdAt: editingChunk?.createdAt || now,
      updatedAt: now,
      fileType: formData.fileType || undefined,
      fileName: formData.fileName || undefined,
    };

    try {
      await setDoc(doc(db, 'knowledgeChunks', id), newChunk);
      setIsAdding(false);
      setEditingChunk(null);
      setFormData({ title: '', content: '', category: 'General', tags: '', fileType: '', fileName: '' });
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
    <div className="flex flex-col h-full bg-slate-50 p-8 font-sans overflow-y-auto">
      <div className="flex justify-between items-center mb-10">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Knowledge Repository</h2>
          <p className="text-sm text-slate-500">Manage organizational data and AI training sets.</p>
        </div>
        <div className="flex gap-3">
          {hiddenCategories.length > 0 && (
            <button 
              onClick={() => setHiddenCategories([])}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              Restore Hidden Categories
            </button>
          )}
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-all shadow-sm font-semibold text-sm"
          >
            <Plus size={18} />
            <span>Add Entry</span>
          </button>
        </div>
      </div>

      <div className="relative mb-10">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input 
          type="text"
          placeholder="Search by title, content, or category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm"
        />
      </div>

      <div className="space-y-10">
        {allCategories.map(cat => {
          const items = groupedChunks[cat] || [];
          if (items.length === 0 && searchQuery) return null;
          
          const isExpanded = expandedCategories[cat] ?? true;

          return (
            <div key={cat} className="space-y-5 group/cat">
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => toggleCategory(cat)}
                  className="flex items-center gap-2.5 text-slate-900 hover:text-indigo-600 transition-colors"
                >
                  <div className="w-6 h-6 flex items-center justify-center bg-white border border-slate-200 rounded-md shadow-sm">
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </div>
                  <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-3">
                    {cat}
                    <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-mono">{items.length}</span>
                  </h3>
                </button>
                
                <button 
                  onClick={() => handleDeleteCategory(cat)}
                  className="opacity-0 group-hover/cat:opacity-100 p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all flex items-center gap-2 text-[10px] font-bold uppercase tracking-tighter"
                  title={`Remove ${cat} category`}
                >
                  <Trash2 size={14} />
                  <span>Remove Category</span>
                </button>
              </div>

              {isExpanded && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {items.map(chunk => (
                    <div key={chunk.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-indigo-500/50 transition-all group relative">
                      <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => {
                            setEditingChunk(chunk);
                            setFormData({ 
                              title: chunk.title, 
                              content: chunk.content, 
                              category: chunk.category || 'General',
                              tags: chunk.tags.join(', '),
                              fileType: chunk.fileType || '',
                              fileName: chunk.fileName || ''
                            });
                            setIsAdding(true);
                          }}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => handleDelete(chunk.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div className="mb-4">
                        <h4 className="text-base font-bold text-slate-900 mb-1.5">{chunk.title}</h4>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
                          <FileText size={12} />
                          <span>Updated {new Date(chunk.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <p className="text-slate-600 text-sm line-clamp-3 mb-6 leading-relaxed">
                        {chunk.content}
                      </p>

                      <div className="flex flex-wrap gap-1.5">
                        {chunk.tags.map(tag => (
                          <span key={tag} className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                            {tag}
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
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl p-8 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-slate-900">{editingChunk ? 'Edit Entry' : 'New Knowledge Entry'}</h3>
                <p className="text-sm text-slate-500">Provide details to enhance the AI's knowledge base.</p>
              </div>
              <button onClick={() => { setIsAdding(false); setEditingChunk(null); }} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Category</label>
                  <select 
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm font-medium"
                  >
                    {allCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="custom">+ New Category...</option>
                  </select>
                  {formData.category === 'custom' && (
                    <input 
                      type="text"
                      placeholder="Category name"
                      className="w-full mt-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm"
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
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Title</label>
                  <input 
                    required
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm"
                    placeholder="e.g., Internal Policy"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Content</label>
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isExtracting}
                    className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 transition-colors disabled:opacity-50"
                  >
                    {isExtracting ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                    {isExtracting ? 'Extracting...' : 'Upload Document'}
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
                  rows={8}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none text-sm leading-relaxed"
                  placeholder="Paste text or upload a document..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Tags</label>
                <input 
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm"
                  placeholder="Comma separated tags..."
                />
              </div>

              <button 
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3.5 rounded-xl hover:bg-indigo-700 transition-all font-bold shadow-sm"
              >
                <Save size={18} />
                {editingChunk ? 'Save Changes' : 'Add to Repository'}
              </button>
            </form>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-8 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Confirm Deletion</h3>
            <p className="text-slate-500 text-sm mb-8 leading-relaxed">
              {confirmDelete.type === 'chunk' 
                ? "Are you sure you want to delete this knowledge entry? This action cannot be undone."
                : `Are you sure you want to remove the "${confirmDelete.name}" category? ${confirmDelete.count && confirmDelete.count > 0 ? `This will delete ALL ${confirmDelete.count} entries within it.` : "This category is currently empty and will be hidden from your view."}`
              }
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all font-bold text-sm"
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
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all font-bold text-sm shadow-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
