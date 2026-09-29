export type DocumentRecord = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  created_at: string;
  updated_at: string;
};

export type SourceCitation = {
  documentId: string;
  documentTitle: string;
  chunkId: string;
  content: string;
  similarity?: number;
};

export type ChatResponse = {
  answer: string;
  conversationId: string;
  sources: SourceCitation[];
};
