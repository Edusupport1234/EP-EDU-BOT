import React, { useState, useEffect, useRef } from 'react';
import { db, collection, query, where, orderBy, onSnapshot, setDoc, doc, deleteDoc, auth } from '../firebase';
import { KnowledgeChunk } from '../types';
import { Plus, Trash2, Edit2, Search, X, Save, FileText, Upload, Loader2, ChevronRight, ChevronDown, Mic, Square, Play, Volume2, ArrowUp, AlertCircle, RotateCcw, History, Database, Star } from 'lucide-react';
import { cn } from '../lib/utils';
import { GoogleGenAI } from "@google/genai";
import { motion } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';

interface Props {
  userId: string;
  initialSearch?: string;
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

export default function KnowledgeBaseManager({ userId, initialSearch }: Props) {
  const { t } = useLanguage();
  const [chunks, setChunks] = useState<KnowledgeChunk[]>([]);
  const [deletedChunks, setDeletedChunks] = useState<KnowledgeChunk[]>([]);
  const [showDeleted, setShowDeleted] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [editingChunk, setEditingChunk] = useState<KnowledgeChunk | null>(null);
  const [viewingChunk, setViewingChunk] = useState<KnowledgeChunk | null>(null);
  const [searchQuery, setSearchQuery] = useState(initialSearch || '');

  useEffect(() => {
    if (initialSearch !== undefined) {
      setSearchQuery(initialSearch);
    }
  }, [initialSearch]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionStatus, setExtractionStatus] = useState<string>('Extracting...');
  const [isRecording, setIsRecording] = useState(false);
  const [isRequestingMic, setIsRequestingMic] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({ 'CFF': true, 'Schedule': true });
  
  const [formData, setFormData] = useState({ 
    title: '', 
    content: '', 
    summary: '',
    category: 'General',
    tags: '',
    fileType: '',
    fileName: '',
    imageData: '',
    mediaUrl: '',
    mediaType: undefined as 'audio' | 'video' | undefined
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'chunk' | 'category', id?: string, name?: string, count?: number } | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [hiddenCategories, setHiddenCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`hidden_cats_${userId}`);
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("Failed to parse hidden categories:", e);
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(`hidden_cats_${userId}`, JSON.stringify(hiddenCategories));
  }, [hiddenCategories, userId]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredChunks = chunks.filter(chunk => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = (
      (chunk.title || '').toLowerCase().includes(query) ||
      (chunk.content || '').toLowerCase().includes(query) ||
      (chunk.category || '').toLowerCase().includes(query) ||
      (chunk.tags || []).some(t => (t || '').toLowerCase().includes(query)) ||
      chunk.id === searchQuery
    );
    
    if (showFavoritesOnly) {
      return matchesSearch && chunk.isFavorite;
    }
    
    return matchesSearch;
  });

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
    }, (error: any) => {
      console.error("Knowledge chunks listener error:", error);
      if (error.code === 'resource-exhausted' || error.message?.includes('resource-exhausted') || error.message?.includes('Quota exceeded')) {
        setWarning("Firestore daily quota exceeded. Real-time updates are paused until the quota resets at midnight (Pacific Time).");
      } else {
        handleFirestoreError(error, OperationType.LIST, 'knowledgeChunks');
      }
    });

    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    const q = query(
      collection(db, 'deletedChunks'),
      where('userId', '==', userId),
      orderBy('deletedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as KnowledgeChunk);
      setDeletedChunks(data);
    }, (error: any) => {
      console.error("Deleted chunks listener error:", error);
      if (error.code === 'resource-exhausted' || error.message?.includes('resource-exhausted') || error.message?.includes('Quota exceeded')) {
        setWarning("Firestore daily quota exceeded. Real-time updates are paused.");
      }
    });

    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    const handleScroll = () => {
      if (containerRef.current) {
        setShowBackToTop(containerRef.current.scrollTop > 500);
      }
    };
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
    }
    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const scrollToTop = () => {
    containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement> | Blob) => {
    let file: File | Blob;
    let fileName = '';
    let fileType = '';

    if (e instanceof Blob) {
      console.log("Processing audio blob from voice note...", e.size, e.type);
      file = e;
      fileName = `voice-note-${Date.now()}.${e.type.split('/')[1]?.split(';')[0] || 'wav'}`;
      fileType = e.type || 'audio/wav';
    } else {
      const selectedFile = e.target.files?.[0];
      if (!selectedFile) return;
      console.log("Processing uploaded file...", selectedFile.name, selectedFile.type);
      file = selectedFile;
      fileName = selectedFile.name;
      fileType = selectedFile.type;
    }

    setIsExtracting(true);
    setExtractionStatus(fileType.startsWith('image/') ? 'Resizing image...' : 'Preparing file...');
    try {
      const getBase64 = (file: File | Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve((e.target?.result as string).split(',')[1]);
          reader.onerror = (e) => reject(new Error("File reading failed"));
          reader.readAsDataURL(file);
        });
      };

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
      if (fileType.startsWith('image/')) {
        base64Data = await resizeImage(file as File);
      } else {
        setExtractionStatus('Reading file...');
        base64Data = await getBase64(file);
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Gemini API key not found. Please ensure GEMINI_API_KEY is set.");
      }
      
      const ai = new GoogleGenAI({ apiKey });
      
      const isMedia = fileType.startsWith('audio/') || fileType.startsWith('video/');
      
      setExtractionStatus(isMedia ? 'Transcribing Media...' : 'Analyzing with AI...');
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            { inlineData: { data: base64Data, mimeType: fileType.startsWith('image/') ? 'image/jpeg' : fileType } },
            { text: isMedia 
              ? "Please provide a literal, word-for-word transcription of this media file. Do not summarize, paraphrase, or add any commentary in the transcription section. After the transcription, provide a separate 1-2 sentence summary. Format your response exactly as: ARTICLE: [literal transcription] SUMMARY: [concise summary]"
              : "Extract all the text and key information from this file. Format it clearly as a knowledge base article. Also, provide a concise 1-2 sentence summary of the content. Format your response as: ARTICLE: [article text] SUMMARY: [summary text]" 
            }
          ]
        },
        config: {
          systemInstruction: isMedia 
            ? "You are a specialized transcription engine. Your primary goal is to provide a literal, word-for-word transcription of audio files. Accuracy is paramount. Do not interpret or summarize in the transcription section. Only provide the summary in the SUMMARY section."
            : "You are a document analysis assistant. Extract information accurately and format it as requested."
        }
      });

      const fullText = response.text || "";
      const articleMatch = fullText.match(/ARTICLE:([\s\S]*?)(?=SUMMARY:|$)/i);
      const summaryMatch = fullText.match(/SUMMARY:([\s\S]*?)$/i);

      const extractedContent = articleMatch ? articleMatch[1].trim() : fullText;
      const extractedSummary = summaryMatch ? summaryMatch[1].trim() : "No summary available.";

      setFormData(prev => ({
        ...prev,
        title: prev.title || fileName.split('.')[0],
        content: extractedContent,
        summary: extractedSummary,
        fileType: fileType.startsWith('image/') ? 'image/jpeg' : fileType,
        fileName: fileName,
        imageData: fileType.startsWith('image/') ? `data:image/jpeg;base64,${base64Data}` : prev.imageData,
        mediaUrl: isMedia ? `data:${fileType};base64,${base64Data}` : prev.mediaUrl,
        mediaType: fileType.startsWith('audio/') ? 'audio' : fileType.startsWith('video/') ? 'video' : prev.mediaType
      }));
    } catch (error) {
      console.error('File extraction error:', error);
      alert(error instanceof Error ? error.message : "Failed to process file. Please try a smaller file.");
    } finally {
      setIsExtracting(false);
    }
  };

  const startRecording = async () => {
    console.log("Attempting to start recording...");
    setIsRequestingMic(true);

    if (typeof MediaRecorder === 'undefined') {
      alert('Your browser does not support voice recording (MediaRecorder API missing).');
      setIsRequestingMic(false);
      return;
    }

    if (typeof navigator.mediaDevices === 'undefined' || !navigator.mediaDevices.getUserMedia) {
      alert('Your browser or environment does not support voice recording. Please ensure you are using a modern browser and have granted necessary permissions.');
      setIsRequestingMic(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      setIsRequestingMic(false);
      console.log("Microphone access granted.");

      // Determine supported mime type
      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = MediaRecorder.isTypeSupported('audio/ogg') ? 'audio/ogg' : 'audio/mp4';
      }
      
      console.log(`Using mimeType: ${mimeType}`);

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        console.log("Recording stopped, processing audio...");
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        handleFileUpload(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.onerror = (event: any) => {
        console.error("MediaRecorder error:", event.error);
        alert("An error occurred during recording: " + event.error);
        setIsRecording(false);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      console.log("Recording started.");
      
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error: any) {
      setIsRequestingMic(false);
      console.error('Error starting recording:', error);
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        alert('Microphone access denied. If you are using the preview window, please try opening the app in a new tab using the button at the top right of the preview. You may also need to check your browser settings to allow microphone access for this site.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        alert('No microphone found. Please connect a microphone and try again.');
      } else {
        alert('Could not access microphone: ' + (error.message || 'Unknown error'));
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const generateIdFromTitle = (title: string) => {
    return title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || crypto.randomUUID();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. Explicit Validation
    if (!formData.title || !formData.content || !formData.category) {
      setSaveError("Required fields missing: Title, Content, and Category are mandatory.");
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    // Check for quota warning before saving
    if (warning && (warning.includes('quota') || warning.includes('limit'))) {
      setSaveError("Cannot save: Firestore daily quota exceeded. Please try again after midnight.");
      setIsSaving(false);
      return;
    }

    const targetId = editingChunk?.id || generateIdFromTitle(formData.title);

    // Check for duplicate title/ID collision
    const isDuplicate = chunks.some(chunk => 
      (chunk.id === targetId || chunk.title.toLowerCase() === formData.title.toLowerCase()) && 
      chunk.id !== editingChunk?.id
    );

    if (isDuplicate) {
      setWarning("This title is already used. Please enter a new one to proceed.");
      setIsSaving(false);
      return;
    }

    const id = targetId;
    const now = Date.now();
    
    // 2. Sanitize Input with Defaults & Modern ES6+
    const newChunk: KnowledgeChunk = {
      id,
      title: formData.title,
      content: formData.content,
      summary: formData.summary || '',
      category: formData.category,
      tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(t => t) : [],
      userId,
      createdAt: editingChunk?.createdAt || now,
      updatedAt: now,
      fileType: formData.fileType || 'text/plain',
      fileName: formData.fileName || 'untitled',
      imageData: formData.imageData || '',
      mediaUrl: formData.mediaUrl || '',
      mediaType: formData.mediaType || undefined,
      isFavorite: editingChunk?.isFavorite ?? false
    };

    try {
      // 3. Detailed Logging for setDoc
      console.log(`Attempting to commit to knowledgeChunks/${id}`, newChunk);
      
      await setDoc(doc(db, 'knowledgeChunks', id), newChunk);
      
      setIsAdding(false);
      setIsCustomCategory(false);
      setEditingChunk(null);
      setFormData({ 
        title: '', 
        content: '', 
        summary: '', 
        category: 'General', 
        tags: '', 
        fileType: '', 
        fileName: '', 
        imageData: '',
        mediaUrl: '',
        mediaType: undefined
      });
    } catch (error: any) {
      // 4. Specific field failure logging
      console.error("Firestore Save Failure:", error);
      
      if (error.message?.includes('resource-exhausted') || error.message?.includes('Quota exceeded')) {
        setWarning("Firestore daily quota exceeded. The free tier limit for reads/writes has been reached. This will reset at midnight (Pacific Time).");
      } else if (error.message?.includes('undefined')) {
        const fieldMatch = error.message.match(/found in field (.*)\)/);
        const failingField = fieldMatch ? fieldMatch[1] : 'unknown';
        setSaveError(`Data integrity error: The field "${failingField}" contains invalid data.`);
      } else {
        setSaveError(error.message || "Failed to commit to repository. Please check your connection.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmDelete({ type: 'chunk', id });
  };

  const executeDeleteChunk = async (id: string) => {
    try {
      const chunkToDelete = chunks.find(c => c.id === id);
      if (chunkToDelete) {
        const deletedChunk = { ...chunkToDelete, deletedAt: Date.now() };
        await setDoc(doc(db, 'deletedChunks', id), deletedChunk);
        await deleteDoc(doc(db, 'knowledgeChunks', id));
      }
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
        await Promise.all(allItemsInCategory.map(async (item) => {
          const deletedChunk = { ...item, deletedAt: Date.now() };
          await setDoc(doc(db, 'deletedChunks', item.id), deletedChunk);
          await deleteDoc(doc(db, 'knowledgeChunks', item.id));
        }));
      }
      setHiddenCategories(prev => Array.from(new Set([...prev, cat])));
      setConfirmDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `knowledgeChunks (category: ${cat})`);
    }
  };

  const restoreChunk = async (chunk: KnowledgeChunk) => {
    try {
      const { deletedAt, ...rest } = chunk;
      await setDoc(doc(db, 'knowledgeChunks', chunk.id), { ...rest, updatedAt: Date.now() });
      await deleteDoc(doc(db, 'deletedChunks', chunk.id));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `knowledgeChunks/${chunk.id}`);
    }
  };

  const toggleFavorite = async (chunk: KnowledgeChunk, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await setDoc(doc(db, 'knowledgeChunks', chunk.id), {
        isFavorite: !chunk.isFavorite,
        updatedAt: Date.now()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `knowledgeChunks/${chunk.id}`);
    }
  };

  const permanentlyDeleteChunk = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'deletedChunks', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `deletedChunks/${id}`);
    }
  };

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  return (
    <div ref={containerRef} className="flex flex-col h-full bg-paper p-12 font-pixel overflow-y-auto selection:bg-accent/10 selection:text-accent">
      {/* Warning Modal */}
      {warning && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-md flex items-center justify-center p-12 z-[100]">
          <div className="bg-card-bg w-full max-w-xl border-4 border-ink p-16 animate-in fade-in zoom-in-95 duration-200 shadow-[16px_16px_0px_0px_var(--color-shadow)]">
            <h3 className="text-4xl font-bold text-ink mb-6 tracking-tight">{t('systemWarning')}</h3>
            <p className="text-ink-muted text-lg mb-12 leading-relaxed font-bold tracking-widest">
              {warning}
            </p>
            <button 
              onClick={() => setWarning(null)}
              className="w-full px-8 py-5 bg-accent text-paper border-4 border-ink hover:bg-accent/80 transition-all font-bold text-sm tracking-widest shadow-[8px_8px_0px_0px_var(--color-shadow)] active:shadow-none active:translate-x-1 active:translate-y-1"
            >
              {t('acknowledge')}
            </button>
          </div>
        </div>
      )}

      <div className="flex justify-between items-baseline mb-16">
        <div className="space-y-4">
          <h2 className="text-7xl font-bold text-ink tracking-tight leading-none">
            {showDeleted ? t('recycleBin') : t('repository')}
          </h2>
          <p className="text-sm font-bold text-accent tracking-[0.3em] opacity-80">
            {showDeleted ? t('purgedIntelligence') : t('curatedIntelligence')}
          </p>
        </div>
        <div className="flex items-center gap-8">
          {!showDeleted && (
            <button 
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={cn(
                "flex items-center gap-3 transition-all duration-300 group",
                showFavoritesOnly ? "text-accent" : "text-ink hover:text-accent"
              )}
            >
              <Star 
                size={24} 
                strokeWidth={2.5} 
                fill={showFavoritesOnly ? "currentColor" : "none"}
                className={cn(
                  "transition-all duration-500",
                  showFavoritesOnly ? "scale-110" : "group-hover:scale-110"
                )} 
              />
              <span className="font-bold text-xl tracking-tight">
                {t('favorites')}
              </span>
            </button>
          )}
          <button 
            onClick={() => setShowDeleted(!showDeleted)}
            className="flex items-center gap-3 text-ink hover:text-accent transition-all duration-300 group"
          >
            {!showDeleted && (
              <motion.div
                animate={showDeleted ? { scale: 1.1, color: 'var(--color-accent)' } : { scale: 1 }}
                whileHover={{ y: -2 }}
                className="relative"
              >
                <Trash2 
                  size={24} 
                  strokeWidth={2.5} 
                  className={cn(
                    "transition-all duration-500",
                    showDeleted ? "text-accent" : "group-hover:rotate-12"
                  )} 
                />
              </motion.div>
            )}
            <span className="font-bold text-xl tracking-tight">
              {showDeleted ? t('repository') : t('recycleBin')}
            </span>
          </button>
          {!showDeleted && hiddenCategories.length > 0 && (
            <button 
              onClick={() => setHiddenCategories([])}
              className="text-xs font-bold text-accent tracking-widest hover:opacity-60 transition-opacity"
            >
              {t('restoreHidden')}
            </button>
          )}
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-3 text-ink hover:text-accent transition-all duration-300 group"
          >
            <Plus size={24} strokeWidth={2.5} className="group-hover:rotate-90 transition-transform duration-500" />
            <span className="font-bold text-xl tracking-tight">{t('addEntry')}</span>
          </button>
        </div>
      </div>

      {showDeleted ? (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {deletedChunks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-40 text-center space-y-8 bg-card-bg border-4 border-ink border-dashed">
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-ink">{t('recycleBinVacant')}</h3>
                <p className="text-ink-muted text-sm tracking-widest">{t('noPurgedIntelligence')}</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {deletedChunks.map(chunk => (
                <div 
                  key={chunk.id}
                  className="bg-card-bg border-4 border-ink p-10 space-y-8 hover:shadow-[12px_12px_0px_0px_var(--color-shadow)] transition-all duration-300 group"
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold text-accent tracking-widest bg-accent/10 px-3 py-1 uppercase">
                        {chunk.category}
                      </span>
                      <span className="text-[10px] font-bold text-ink-muted tracking-widest">
                        {t('deletedOn')} {new Date(chunk.deletedAt || 0).toLocaleDateString()}
                      </span>
                    </div>
                    <h4 className="text-2xl font-bold text-ink leading-tight">{chunk.title}</h4>
                    <p className="text-ink-muted text-sm leading-relaxed line-clamp-3 font-bold tracking-tight">
                      {chunk.summary}
                    </p>
                  </div>
                  
                  <div className="flex gap-4 pt-4">
                    <button 
                      onClick={() => restoreChunk(chunk)}
                      className="flex-1 flex items-center justify-center gap-3 px-4 py-3 bg-accent text-paper border-2 border-ink hover:bg-accent/80 transition-all font-bold text-[10px] tracking-widest shadow-[4px_4px_0px_0px_var(--color-shadow)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                    >
                      <RotateCcw size={14} />
                      <span>{t('restore')}</span>
                    </button>
                    <button 
                      onClick={() => permanentlyDeleteChunk(chunk.id)}
                      className="flex-1 flex items-center justify-center gap-3 px-4 py-3 bg-paper text-red-500 border-2 border-ink hover:bg-red-50 transition-all font-bold text-[10px] tracking-widest shadow-[4px_4px_0px_0px_var(--color-shadow)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                    >
                      <Trash2 size={14} />
                      <span>{t('purge')}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="relative mb-20 group">
            <Search className="absolute left-0 top-1/2 -translate-y-1/2 text-ink-muted group-focus-within:text-accent transition-colors" size={24} strokeWidth={2} />
            <input 
              type="text"
              placeholder={t('searchKnowledge')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-6 bg-transparent border-b-4 border-ink focus:border-accent outline-none transition-all duration-500 text-2xl font-bold placeholder:text-ink-muted"
            />
          </div>

      {/* Table of Contents */}
      <div className="mb-20 animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="flex items-center gap-6 mb-8">
          <div className="h-0.5 flex-1 bg-ink/10"></div>
          <h3 className="text-xs font-bold tracking-[0.5em] text-ink opacity-70">{t('intelligenceIndex')}</h3>
          <div className="h-0.5 flex-1 bg-ink/10"></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {allCategories.map(cat => {
            const count = groupedChunks[cat]?.length || 0;
            if (count === 0 && (searchQuery || showFavoritesOnly)) return null;
            return (
              <a 
                key={cat}
                href={`#category-${cat.replace(/\s+/g, '-').toLowerCase()}`}
                onClick={(e) => {
                  e.preventDefault();
                  const element = document.getElementById(`category-${cat.replace(/\s+/g, '-').toLowerCase()}`);
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
                className="group flex items-center justify-between p-4 bg-card-bg border-2 border-ink hover:bg-accent hover:text-paper transition-all duration-300 shadow-[4px_4px_0px_0px_var(--color-shadow)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5"
              >
                <span className="text-xs font-bold truncate pr-2">{cat}</span>
                <span className="text-[10px] font-bold opacity-70 group-hover:opacity-100">[{count}]</span>
              </a>
            );
          })}
        </div>
      </div>

      <div className="space-y-10">
        {allCategories.map(cat => {
          const items = groupedChunks[cat] || [];
          if (items.length === 0 && (searchQuery || showFavoritesOnly)) return null;
          
          const isExpanded = expandedCategories[cat] ?? true;

          return (
            <div 
              key={cat} 
              id={`category-${cat.replace(/\s+/g, '-').toLowerCase()}`}
              className="space-y-10 group/cat scroll-mt-12"
            >
              <div className="flex items-center justify-between border-b-2 border-ink pb-6">
                <button 
                  onClick={() => toggleCategory(cat)}
                  className="flex items-center gap-6 text-ink hover:text-accent transition-colors group"
                >
                  <div className={cn(
                    "w-12 h-12 flex items-center justify-center bg-paper text-ink border-2 border-ink transition-all duration-300 group-hover:bg-accent group-hover:text-paper shadow-[4px_4px_0px_0px_var(--color-shadow)]",
                    !isExpanded && "-rotate-90"
                  )}>
                    <ChevronDown size={24} strokeWidth={3} />
                  </div>
                  <h3 className="text-lg font-bold tracking-[0.4em] flex items-center gap-6">
                    {cat}
                    <span className="text-sm opacity-70">[{items.length}]</span>
                  </h3>
                </button>
                
                <button 
                  onClick={() => handleDeleteCategory(cat)}
                  className="opacity-0 group-hover/cat:opacity-100 p-2 text-ink-muted hover:text-red-500 transition-all text-xs font-bold tracking-widest"
                >
                  {t('moveCategoryToBin')}
                </button>
              </div>

              {isExpanded && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    {items.map(chunk => (
                      <div 
                        key={chunk.id} 
                        onClick={() => setViewingChunk(chunk)}
                        className="bougie-card p-10 group relative flex flex-col h-full cursor-pointer"
                      >
                        <div className={cn(
                          "absolute top-8 right-8 flex gap-3 transition-all duration-300 z-20",
                          chunk.isFavorite ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        )}>
                          <button 
                            onClick={(e) => toggleFavorite(chunk, e)}
                            className={cn(
                              "p-2 transition-all",
                              chunk.isFavorite ? "text-accent opacity-100" : "text-ink hover:text-accent"
                            )}
                            title={chunk.isFavorite ? "Unfavorite" : "Favorite"}
                          >
                            <Star size={18} strokeWidth={2.5} fill={chunk.isFavorite ? "currentColor" : "none"} />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingChunk(chunk);
                              setFormData({ 
                                title: chunk.title, 
                                content: chunk.content, 
                                summary: chunk.summary || '',
                                category: chunk.category || 'General',
                                tags: (chunk.tags || []).join(', '),
                                fileType: chunk.fileType || '',
                                fileName: chunk.fileName || '',
                                imageData: chunk.imageData || '',
                                mediaUrl: chunk.mediaUrl || '',
                                mediaType: chunk.mediaType
                              });
                              setIsAdding(true);
                            }}
                            className="p-2 text-ink hover:text-accent transition-all"
                          >
                            <Edit2 size={18} strokeWidth={2} />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(chunk.id);
                            }}
                            className="p-2 text-ink hover:text-red-500 transition-all"
                          >
                            <Trash2 size={18} strokeWidth={2} />
                          </button>
                        </div>

                      <div className="mb-10">
                        <h4 className="text-3xl font-bold text-ink mb-4 leading-tight break-words">{chunk.title}</h4>
                        <div className="flex items-center gap-4 text-xs text-accent font-bold tracking-widest opacity-80">
                          <FileText size={14} strokeWidth={2} />
                          <span>{new Date(chunk.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                      </div>

                      {chunk.imageData && (
                        <div className="mb-10 border-4 border-ink shadow-[4px_4px_0px_0px_var(--color-shadow)] overflow-hidden h-48 bg-card-bg">
                          <img 
                            src={chunk.imageData} 
                            alt={chunk.title} 
                            className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}

                      {chunk.mediaUrl && chunk.mediaType === 'audio' && (
                        <div className="mb-10 border-4 border-ink p-4 bg-card-bg shadow-[4px_4px_0px_0px_var(--color-shadow)]">
                          <audio src={chunk.mediaUrl} controls className="w-full h-10" />
                        </div>
                      )}

                      {chunk.mediaUrl && chunk.mediaType === 'video' && (
                        <div className="mb-10 border-4 border-ink overflow-hidden bg-card-bg shadow-[4px_4px_0px_0px_var(--color-shadow)]">
                          <video src={chunk.mediaUrl} controls className="w-full h-48 object-cover" />
                        </div>
                      )}

                      {chunk.summary && (
                        <div className="mb-10 p-6 bg-accent/5 border-l-4 border-accent">
                          <p className="text-base text-ink font-bold leading-relaxed">
                            {chunk.summary}
                          </p>
                        </div>
                      )}

                      <p className="text-ink-muted text-lg line-clamp-4 mb-10 leading-relaxed flex-grow">
                        {chunk.content}
                      </p>

                      <div className="flex flex-wrap gap-3 mt-auto">
                        {(chunk.tags || []).map(tag => (
                          <span key={tag} className="text-xs font-bold text-ink tracking-widest bg-paper border-2 border-ink px-4 py-1.5">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <div className="col-span-full py-10 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center text-ink-muted text-sm font-bold tracking-widest">
                      {showFavoritesOnly ? t('noFavoritedEntries') : (searchQuery ? t('noEntriesInCategory') : t('categoryEmpty'))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  )}

  {showBackToTop && (
        <button 
          onClick={scrollToTop}
          className="fixed bottom-12 right-6 z-[100] w-12 h-12 bg-paper text-ink border-2 border-ink shadow-[4px_4px_0px_0px_var(--color-shadow)] flex items-center justify-center hover:bg-accent hover:text-paper transition-all duration-300 group animate-in fade-in slide-in-from-right-10"
          title={t('backToTop')}
        >
          <ChevronDown size={24} strokeWidth={3} className="rotate-180 group-hover:-translate-y-1 transition-transform" />
        </button>
      )}

      {isAdding && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-md flex items-center justify-center p-12 z-50">
          <div className="bg-card-bg w-full max-w-4xl border-4 border-ink p-16 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto relative">
            <button onClick={() => { setIsAdding(false); setEditingChunk(null); setIsCustomCategory(false); }} className="absolute top-12 right-12 p-4 text-ink-muted hover:text-ink transition-colors">
              <X size={36} strokeWidth={2} />
            </button>

            <div className="mb-16">
              <h3 className="text-5xl font-bold text-ink mb-4 tracking-tight">{editingChunk ? t('refineEntry') : t('newIntelligenceTitle')}</h3>
              <p className="text-sm font-bold text-accent tracking-[0.3em] opacity-80">{t('acquisitionProtocol')}</p>
            </div>

            <form onSubmit={handleSave} className="space-y-12">
              {saveError && (
                <div className="p-6 bg-red-50 border-4 border-red-500 text-red-600 font-bold flex items-center gap-4 animate-in fade-in slide-in-from-top-4">
                  <AlertCircle size={24} />
                  <p>{saveError}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-16">
                <div className="space-y-4">
                  <label className="text-xs font-bold text-ink tracking-widest opacity-80">{t('category')}</label>
                  <select 
                    value={isCustomCategory ? 'custom' : formData.category}
                    onChange={(e) => {
                      if (e.target.value === 'custom') {
                        setIsCustomCategory(true);
                      } else {
                        setIsCustomCategory(false);
                        setFormData({ ...formData, category: e.target.value });
                      }
                    }}
                    className="w-full bg-transparent border-b-4 border-ink py-4 focus:border-accent outline-none transition-all duration-300 text-lg font-bold appearance-none cursor-pointer text-ink"
                  >
                    {allCategories.map(cat => (
                      <option key={cat} value={cat} className="bg-card-bg text-ink">{cat}</option>
                    ))}
                    {!allCategories.includes(formData.category) && formData.category !== 'custom' && (
                      <option value={formData.category} className="bg-card-bg text-ink">{formData.category}</option>
                    )}
                    <option value="custom" className="bg-card-bg text-ink">+ {t('createNew')}</option>
                  </select>
                  {isCustomCategory && (
                    <input 
                      type="text"
                      autoFocus
                      placeholder={t('defineCategory')}
                      className="w-full mt-6 minimal-input"
                      value={formData.category === 'custom' ? '' : formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      onBlur={(e) => {
                        if (!e.target.value) {
                          setFormData({ ...formData, category: 'General' });
                          setIsCustomCategory(false);
                        }
                      }}
                    />
                  )}
                </div>
                <div className="space-y-4">
                  <label className="text-xs font-bold text-ink tracking-widest opacity-80">{t('title')}</label>
                  <input 
                    required
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full minimal-input"
                    placeholder={t('titlePlaceholder')}
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex justify-between items-end">
                  <label className="text-xs font-bold text-ink tracking-widest opacity-80">{t('intelligenceContent')}</label>
                  <div className="flex items-center gap-6">
                    <button 
                      type="button"
                      onClick={isRecording ? stopRecording : startRecording}
                      disabled={isExtracting || isRequestingMic}
                      className={cn(
                        "flex items-center gap-3 text-xs font-bold transition-all tracking-widest",
                        isRecording ? "text-red-500 animate-pulse" : "text-accent hover:opacity-60",
                        isRequestingMic && "opacity-50 cursor-wait"
                      )}
                    >
                      {isRecording ? <Square size={16} fill="currentColor" /> : (isRequestingMic ? <Loader2 size={16} className="animate-spin" /> : <Mic size={16} strokeWidth={3} />)}
                      {isRecording ? `${t('recording')} (${formatTime(recordingTime)})` : (isRequestingMic ? t('requestingMic') : t('voiceNote'))}
                    </button>
                    <button 
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isExtracting || isRecording}
                      className="flex items-center gap-3 text-xs font-bold text-accent hover:opacity-60 transition-all disabled:opacity-30 tracking-widest"
                    >
                      {isExtracting ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} strokeWidth={3} />}
                      {isExtracting ? extractionStatus : t('ingestDocument')}
                    </button>
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*,application/pdf,text/*,audio/*,video/*"
                    onChange={handleFileUpload}
                  />
                </div>
                <textarea 
                  required
                  rows={6}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full p-8 bg-paper border-2 border-ink focus:border-accent outline-none resize-none text-lg leading-relaxed transition-all duration-300"
                  placeholder={t('contentPlaceholder')}
                />
              </div>

              <div className="space-y-6">
                <label className="text-xs font-bold text-ink tracking-widest opacity-80">{t('executiveSummary')}</label>
                <textarea 
                  required
                  rows={2}
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  className="w-full p-8 bg-paper border-2 border-ink focus:border-accent outline-none resize-none text-lg leading-relaxed transition-all duration-300"
                  placeholder={t('summaryPlaceholder')}
                />
              </div>

              <div className="space-y-4">
                <label className="text-xs font-bold text-ink tracking-widest opacity-80">{t('classificationTags')}</label>
                <input 
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="w-full minimal-input"
                  placeholder={t('tagsPlaceholder')}
                />
              </div>

              <button 
                type="submit"
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-4 bg-ink text-paper py-6 border-4 border-ink hover:bg-accent hover:border-accent active:translate-x-1 active:translate-y-1 transition-all duration-200 font-bold text-xl tracking-[0.2em] mt-12 shadow-[8px_8px_0px_0px_var(--color-shadow)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={24} className="animate-spin" />
                    <span>{t('committing')}</span>
                  </>
                ) : (
                  <>
                    <Save size={24} strokeWidth={2} />
                    <span>{editingChunk ? t('commitChanges') : t('commitRepository')}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-md flex items-center justify-center p-12 z-[60]">
          <div className="bg-card-bg w-full max-w-xl border-4 border-ink p-16 animate-in fade-in zoom-in-95 duration-200 shadow-[16px_16px_0px_0px_var(--color-shadow)]">
            <h3 className="text-4xl font-bold text-ink mb-6">{t('moveToRecycle')}</h3>
            <p className="text-ink-muted text-lg mb-12 leading-relaxed font-bold">
              {confirmDelete.type === 'chunk' 
                ? t('confirmDeleteChunk')
                : t('confirmDeleteCategory')
              }
            </p>
            <div className="flex gap-6">
              <button 
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-8 py-5 bg-paper text-ink-muted border-2 border-transparent hover:border-ink transition-all font-bold text-sm tracking-widest"
              >
                {t('cancel')}
              </button>
              <button 
                onClick={() => {
                  if (confirmDelete.type === 'chunk' && confirmDelete.id) {
                    executeDeleteChunk(confirmDelete.id);
                  } else if (confirmDelete.type === 'category' && confirmDelete.name) {
                    executeDeleteCategory(confirmDelete.name);
                  }
                }}
                className="flex-1 px-8 py-5 bg-red-500 text-white border-2 border-ink hover:bg-red-600 transition-all font-bold text-sm tracking-widest shadow-[4px_4px_0px_0px_var(--color-shadow)]"
              >
                {t('confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
      {viewingChunk && (
        <div className="fixed inset-0 bg-ink/60 backdrop-blur-xl flex items-center justify-center p-8 md:p-16 z-50 overflow-y-auto">
          <div className="bg-paper w-full max-w-6xl border-8 border-ink shadow-[24px_24px_0px_0px_var(--color-shadow)] animate-in fade-in zoom-in-95 duration-300 relative flex flex-col max-h-[90vh]">
            <button 
              onClick={() => setViewingChunk(null)} 
              className="absolute top-8 right-8 p-2 text-ink hover:text-accent transition-all z-10"
            >
              <X size={32} strokeWidth={3} />
            </button>

            <button 
              onClick={(e) => {
                toggleFavorite(viewingChunk, e);
                setViewingChunk(prev => prev ? { ...prev, isFavorite: !prev.isFavorite } : null);
              }}
              className={cn(
                "absolute top-8 right-24 p-2 transition-all z-10",
                viewingChunk.isFavorite ? "text-accent" : "text-ink hover:text-accent"
              )}
              title={viewingChunk.isFavorite ? "Unfavorite" : "Favorite"}
            >
              <Star size={32} strokeWidth={3} fill={viewingChunk.isFavorite ? "currentColor" : "none"} />
            </button>

            <div className="flex-1 overflow-y-auto p-12 md:p-20 space-y-16">
              <div className="space-y-8">
                <div className="flex items-center gap-6">
                  <span className="px-6 py-2 bg-accent text-paper font-bold tracking-widest text-sm border-2 border-ink">
                    {viewingChunk.category || 'General'}
                  </span>
                  <div className="h-0.5 flex-1 bg-ink/10"></div>
                </div>
                <h2 className="text-6xl md:text-8xl font-bold text-ink tracking-tight leading-none break-words">
                  {viewingChunk.title}
                </h2>
                <div className="flex items-center gap-8 text-sm font-bold text-ink-muted tracking-[0.3em]">
                  <div className="flex items-center gap-3">
                    <FileText size={18} />
                    <span>{t('updated')} {new Date(viewingChunk.updatedAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Plus size={18} />
                    <span>{t('id')}: {viewingChunk.id.slice(0, 8)}</span>
                  </div>
                </div>
              </div>

              {viewingChunk.imageData && (
                <div className="border-8 border-ink shadow-[16px_16px_0px_0px_var(--color-shadow)] overflow-hidden bg-card-bg">
                  <img 
                    src={viewingChunk.imageData} 
                    alt={viewingChunk.title} 
                    className="w-full h-auto object-contain max-h-[60vh] grayscale hover:grayscale-0 transition-all duration-700"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}

              {(viewingChunk.mediaUrl) && (
                <div className="border-8 border-ink p-10 bg-card-bg shadow-[16px_16px_0px_0px_var(--color-shadow)] space-y-6">
                  <div className="flex items-center gap-4 text-ink font-bold tracking-widest">
                    {viewingChunk.mediaType === 'audio' ? <Volume2 size={24} /> : <Play size={24} />}
                    <span>{t('intelligenceMediaStream')}</span>
                  </div>
                  {viewingChunk.mediaType === 'audio' ? (
                    <audio src={viewingChunk.mediaUrl} controls className="w-full h-16" />
                  ) : (
                    <video src={viewingChunk.mediaUrl} controls className="w-full h-auto max-h-[60vh] object-contain" />
                  )}
                </div>
              )}

              {viewingChunk.summary && (
                <div className="p-12 bg-accent text-paper border-4 border-ink shadow-[12px_12px_0px_0px_var(--color-shadow)]">
                  <h5 className="text-xs font-bold tracking-[0.5em] mb-6 opacity-80">{t('executiveSummary')}</h5>
                  <p className="text-2xl md:text-3xl font-bold leading-tight">
                    {viewingChunk.summary}
                  </p>
                </div>
              )}

              <div className="space-y-10">
                <h5 className="text-xs font-bold tracking-[0.5em] text-ink opacity-70">{t('coreIntelligenceData')}</h5>
                <div className="text-2xl md:text-3xl text-ink leading-relaxed font-medium whitespace-pre-wrap border-l-8 border-ink pl-12">
                  {viewingChunk.content}
                </div>
              </div>

              <div className="pt-16 border-t-4 border-ink flex flex-wrap gap-4">
                {(viewingChunk.tags || []).map(tag => (
                  <span key={tag} className="px-8 py-3 bg-paper border-4 border-ink text-ink font-bold tracking-widest hover:bg-ink hover:text-paper transition-all cursor-default">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
