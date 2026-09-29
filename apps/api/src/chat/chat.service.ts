import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { ChatResponse, SourceCitation } from '@goodspeed/shared';
import { AiService } from '../ai/ai.service';
import { SupabaseService } from '../supabase/supabase.service';
import { buildMessageRows } from './chat-persistence';
import { buildSavedMessages, type StoredChunkRow, type StoredMessageRow } from './saved-message-mapper';

@Injectable()
export class ChatService {
  constructor(private readonly supabase: SupabaseService, private readonly ai: AiService) {}

  async listConversations(token: string) {
    const db = this.supabase.forUser(token);
    const { data, error } = await db.from('conversations').select('*').order('updated_at', { ascending: false });
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async listMessages(token: string, conversationId: string) {
    const db = this.supabase.forUser(token);
    const { data, error } = await db.from('messages')
      .select('role,content,source_chunk_ids')
      .eq('conversation_id', conversationId)
      .order('created_at');
    if (error) throw new BadRequestException(error.message);
    const messages = (data ?? []) as StoredMessageRow[];
    const sourceChunkIds = [...new Set(messages.flatMap((message) => message.source_chunk_ids))];
    if (!sourceChunkIds.length) return buildSavedMessages(messages, []);

    const { data: chunks, error: chunkError } = await db.from('document_chunks')
      .select('id,document_id,content,document:documents!document_chunks_document_id_fkey(title)')
      .in('id', sourceChunkIds);
    if (chunkError) throw new BadRequestException(chunkError.message);
    return buildSavedMessages(messages, (chunks ?? []) as unknown as StoredChunkRow[]);
  }

  async ask(userId: string, token: string, question: string, conversationId?: string): Promise<ChatResponse> {
    if (typeof question !== 'string' || !question.trim() || question.length > 4000) throw new BadRequestException('Question must be 1–4000 characters');
    if (conversationId !== undefined && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(conversationId))
      throw new BadRequestException('Invalid conversation ID');
    const db = this.supabase.forUser(token);

    let cid = conversationId;
    if (cid) {
      const { data, error } = await db.from('conversations').select('id').eq('id', cid).single();
      if (error || !data) throw new NotFoundException('Conversation not found');
    }

    const { data: historyRows, error: historyError } = cid ? await db
      .from('messages')
      .select('role,content')
      .eq('conversation_id', cid)
      .order('created_at', { ascending: true }) : { data: [], error: null };
    if (historyError) throw new BadRequestException(historyError.message);

    const { embedding, model } = await this.ai.embed(question.trim());
    const { data: matches, error: matchError } = await db.rpc('match_document_chunks', {
      query_embedding: embedding,
      query_embedding_model: model,
      match_count: 5,
    });
    if (matchError) throw new BadRequestException(matchError.message);

    const sources: SourceCitation[] = (matches ?? []).map((row: any) => ({
      documentId: row.document_id,
      documentTitle: row.document_title,
      chunkId: row.chunk_id,
      content: row.content,
      similarity: Number(row.similarity),
    }));
    const context = sources
      .map((s, index) => `[Source ${index + 1}: ${s.documentTitle}]\n${s.content}`)
      .join('\n\n---\n\n');

    const answer = sources.length ? await this.ai.answer({
      question: question.trim(),
      context,
      history: (historyRows ?? []).map((m: any) => ({ role: m.role, content: m.content })),
    }) : 'I could not find relevant information in your documents to answer that question.';

    if (!cid) {
      const { data, error } = await db.from('conversations')
        .insert({ user_id: userId, title: question.trim().slice(0, 80) }).select('id').single();
      if (error) throw new BadRequestException(error.message);
      cid = data.id;
    }
    if (!cid) throw new BadRequestException('Conversation could not be created');

    // Write the exchange together after the provider succeeds; a failed response leaves no orphaned question.
    const timestamp = Date.now();
    const { error: saveError } = await db.from('messages').insert(buildMessageRows({
      userId,
      conversationId: cid,
      question: question.trim(),
      answer,
      sourceChunkIds: sources.map((source) => source.chunkId),
      timestamp,
    }));
    if (saveError) throw new BadRequestException(saveError.message);
    await db.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', cid);

    return { answer, conversationId: cid, sources };
  }
}
