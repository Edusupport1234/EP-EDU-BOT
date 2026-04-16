export interface KnowledgeChunk {
  id: string;
  title: string;
  content: string;
  summary: string;
  category: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  userId: string;
  fileType?: string;
  fileName?: string;
  imageData?: string;
  mediaUrl?: string;
  mediaType?: 'audio' | 'video';
  deletedAt?: number;
  isFavorite?: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  images?: string[];
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  lastMessage: string;
  updatedAt: number;
  createdAt: number;
}

export interface CalendarEvent {
  id: string;
  userId: string;
  title: string;
  description?: string;
  startTime: number;
  endTime: number;
  color?: string;
  createdAt: number;
}
