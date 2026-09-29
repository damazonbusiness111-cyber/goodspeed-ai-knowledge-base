import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { chunkDocument } from '../common/chunking';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class DocumentsService {
  constructor(private readonly supabase: SupabaseService, private readonly ai: AiService) {}

  async list(token: string) {
    const db = this.supabase.forUser(token);
    const { data, error } = await db.from('documents').select('*').order('updated_at', { ascending: false });
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async create(userId: string, token: string, input: { title: string; content: string; tags?: string[] }) {
    this.validateInput(input, true);
    const db = this.supabase.forUser(token);
    const { data, error } = await db
      .from('documents')
      .insert({ user_id: userId, title: input.title.trim(), content: input.content, tags: input.tags ?? [] })
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    try { await this.reindex(token, data.id, input.content); }
    catch (cause) { await db.from('documents').delete().eq('id', data.id); throw cause; }
    return data;
  }

  async update(_userId: string, token: string, id: string, input: { title?: string; content?: string; tags?: string[] }) {
    this.validateInput(input, false);
    const db = this.supabase.forUser(token);
    const { data: existing, error: findError } = await db.from('documents').select('*').eq('id', id).single();
    if (findError || !existing) throw new NotFoundException('Document not found');

    const next = {
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      ...(input.content !== undefined ? { content: input.content } : {}),
      ...(input.tags !== undefined ? { tags: input.tags } : {}),
      updated_at: new Date().toISOString(),
    };
    if (input.title !== undefined && !input.title.trim()) throw new BadRequestException('Title is required');
    if (input.content !== undefined && !input.content.trim()) throw new BadRequestException('Content is required');
    // Prepare embeddings before changing the document, so provider failure leaves the old index usable.
    const rows = input.content !== undefined ? await this.prepareChunks(input.content) : undefined;
    const { data, error } = rows
      ? await db.rpc('update_document_and_chunks', { target_document_id: id, new_title: input.title ?? null, new_content: input.content, new_tags: input.tags ?? null, new_chunks: rows })
      : await db.from('documents').update(next).eq('id', id).select('*').single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async remove(token: string, id: string) {
    const db = this.supabase.forUser(token);
    const { error } = await db.from('documents').delete().eq('id', id);
    if (error) throw new BadRequestException(error.message);
    return { ok: true };
  }

  private async reindex(token: string, documentId: string, content: string) {
    const rows = await this.prepareChunks(content);
    await this.replaceChunks(token, documentId, rows);
  }

  private async prepareChunks(content: string) {
    const chunks = chunkDocument(content);
    const rows = [];
    for (const chunk of chunks) {
      const { embedding, model } = await this.ai.embed(chunk.content);
      rows.push({
        chunk_index: chunk.index,
        content: chunk.content,
        embedding,
        embedding_model: model,
        embedding_dimension: embedding.length,
      });
    }
    return rows;
  }

  private async replaceChunks(token: string, documentId: string, rows: Awaited<ReturnType<DocumentsService['prepareChunks']>>) {
    const { error } = await this.supabase.forUser(token).rpc('replace_document_chunks', {
      target_document_id: documentId, new_chunks: rows,
    });
    if (error) throw new BadRequestException(`Index replacement failed: ${error.message}`);
  }

  private validateInput(input: { title?: string; content?: string; tags?: string[] }, required: boolean) {
    if (!input || typeof input !== 'object') throw new BadRequestException('Invalid document');
    if (required && (input.title === undefined || input.content === undefined)) throw new BadRequestException('Title and content are required');
    if (input.title !== undefined && (typeof input.title !== 'string' || !input.title.trim() || input.title.length > 200))
      throw new BadRequestException('Title must be 1–200 characters');
    if (input.content !== undefined && (typeof input.content !== 'string' || !input.content.trim() || input.content.length > 250000))
      throw new BadRequestException('Content must be 1–250000 characters');
    if (input.tags !== undefined && (!Array.isArray(input.tags) || input.tags.length > 20 || input.tags.some((tag) => typeof tag !== 'string' || tag.length > 50)))
      throw new BadRequestException('Tags must be an array of up to 20 short strings');
  }
}
