import type { SourceCitation } from '@goodspeed/shared';

export type StoredMessageRow = {
  role: 'user' | 'assistant';
  content: string;
  source_chunk_ids: string[];
};

export type StoredChunkRow = {
  id: string;
  document_id: string;
  content: string;
  document: { title: string } | Array<{ title: string }> | null;
};

export type SavedMessage = {
  role: 'user' | 'assistant';
  content: string;
  sources: SourceCitation[];
};

export function buildSavedMessages(messages: StoredMessageRow[], chunks: StoredChunkRow[]): SavedMessage[] {
  const chunksById = new Map(chunks.map((chunk) => [chunk.id, chunk]));

  return messages.map((message) => ({
    role: message.role,
    content: message.content,
    sources: message.source_chunk_ids.flatMap((chunkId) => {
      const chunk = chunksById.get(chunkId);
      const document = Array.isArray(chunk?.document) ? chunk.document[0] : chunk?.document;
      if (!chunk || !document) return [];

      return [{
        documentId: chunk.document_id,
        documentTitle: document.title,
        chunkId: chunk.id,
        content: chunk.content,
      }];
    }),
  }));
}
