
export type Role = 'user' | 'assistant';

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
}

export interface ChatThread {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}
