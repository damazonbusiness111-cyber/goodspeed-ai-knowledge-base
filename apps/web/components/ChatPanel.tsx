'use client';

import { FormEvent, useEffect, useState } from 'react';
import type { ChatResponse, SourceCitation } from '@goodspeed/shared';
import { api } from '../lib/api';

type Message = { role: 'user' | 'assistant'; content: string; sources?: SourceCitation[] };
type SavedConversation = { id: string; title: string };

export function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState('');
  const [conversationId, setConversationId] = useState<string>();
  const [conversations, setConversations] = useState<SavedConversation[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api<SavedConversation[]>('/chat/conversations').then(setConversations).catch((e: Error) => setError(e.message));
  }, []);

  async function openConversation(id: string) {
    if (!id) { setConversationId(undefined); setMessages([]); return; }
    setBusy(true); setError('');
    try {
      const saved = await api<Message[]>(`/chat/conversations/${id}/messages`);
      setConversationId(id);
      setMessages(saved);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load conversation'); }
    finally { setBusy(false); }
  }

  async function ask(event: FormEvent) {
    event.preventDefault();
    const q = question.trim();
    if (!q || busy) return;
    setMessages((m) => [...m, { role: 'user', content: q }]);
    setQuestion(''); setBusy(true); setError('');
    try {
      const result = await api<ChatResponse>('/chat', { method: 'POST', body: JSON.stringify({ question: q, conversationId }) });
      setConversationId(result.conversationId);
      api<SavedConversation[]>('/chat/conversations').then(setConversations).catch(() => {});
      setMessages((m) => [...m, { role: 'assistant', content: result.answer, sources: result.sources }]);
    } catch (e) {
      setMessages((m) => m.slice(0, -1));
      setQuestion(q);
      setError(e instanceof Error ? e.message : 'Could not send question');
    } finally { setBusy(false); }
  }

  return (
    <section className="chatPanel" aria-busy={busy}>
      <div className="panelHeader"><div><div className="eyebrow">Retrieval</div><h2>Ask your knowledge base</h2></div><button className="ghost compact" disabled={busy} onClick={() => openConversation('')}>New chat</button></div>
      <label className="historyPicker">Saved conversations
        <select value={conversationId ?? ''} onChange={(e) => openConversation(e.target.value)} disabled={busy}>
          <option value="">New conversation</option>
          {conversations.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
        </select>
      </label>
      <div className="messages" aria-live="polite">
        {!messages.length && <div className="emptyState"><strong>Grounded answers only.</strong><p>Questions retrieve your own document chunks first. Sources are shown with each response.</p></div>}
        {messages.map((message, index) => (
          <article key={index} className={`bubble ${message.role}`}>
            <div>{message.content}</div>
            {!!message.sources?.length && <details><summary>{message.sources.length} source{message.sources.length > 1 ? 's' : ''}</summary>{message.sources.map((source) => <div className="source" key={source.chunkId}><strong>{source.documentTitle}</strong>{typeof source.similarity === 'number' && <span>{Math.round(source.similarity * 100)}% match</span>}<p>{source.content.slice(0, 280)}{source.content.length > 280 ? '…' : ''}</p></div>)}</details>}
          </article>
        ))}
        {busy && <div className="bubble assistant">Retrieving context and reasoning…</div>}
      </div>
      <form className="askBar" onSubmit={ask}><textarea aria-label="Question for your knowledge base" maxLength={4000} required value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask a question about your documents…" /><button disabled={busy}>Ask</button></form>
      {error && <p className="error" role="alert">{error}</p>}
    </section>
  );
}
