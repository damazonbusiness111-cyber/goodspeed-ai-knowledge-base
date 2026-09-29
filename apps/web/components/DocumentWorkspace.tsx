'use client';

import { FormEvent, useEffect, useState } from 'react';
import type { DocumentRecord } from '@goodspeed/shared';
import { api } from '../lib/api';

type Draft = { id?: string; title: string; content: string; tags: string };
const emptyDraft: Draft = { title: '', content: '', tags: '' };

export function DocumentWorkspace() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    try { setDocuments(await api<DocumentRecord[]>('/documents')); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not load documents'); }
  }
  useEffect(() => { load(); }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const payload = { title: draft.title, content: draft.content, tags: draft.tags.split(',').map((t) => t.trim()).filter(Boolean) };
      if (draft.id) await api(`/documents/${draft.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      else await api('/documents', { method: 'POST', body: JSON.stringify(payload) });
      setDraft(emptyDraft); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save document'); }
    finally { setBusy(false); }
  }

  async function remove(id: string) {
    if (!confirm('Delete this document and its indexed chunks?')) return;
    setBusy(true); setError('');
    try {
      await api(`/documents/${id}`, { method: 'DELETE' });
      if (draft.id === id) setDraft(emptyDraft);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not delete document'); }
    finally { setBusy(false); }
  }

  return (
    <section className="documentsPanel" aria-busy={busy}>
      <div className="panelHeader"><div><div className="eyebrow">Knowledge</div><h2>Documents</h2></div><button className="ghost compact" disabled={busy} onClick={() => setDraft(emptyDraft)}>New</button></div>
      <div className="documentList">
        {documents.map((doc) => (
          <button key={doc.id} className={`documentItem ${draft.id === doc.id ? 'active' : ''}`} onClick={() => setDraft({ id: doc.id, title: doc.title, content: doc.content, tags: doc.tags.join(', ') })}>
            <strong>{doc.title}</strong><span>{new Date(doc.updated_at).toLocaleString()}</span>
          </button>
        ))}
        {!documents.length && <p className="muted">No documents yet.</p>}
      </div>
      <form className="editor" onSubmit={save}>
        <input aria-label="Document title" maxLength={200} placeholder="Document title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} required />
        <input aria-label="Tags, comma separated" placeholder="Tags, comma separated" value={draft.tags} onChange={(e) => setDraft({ ...draft, tags: e.target.value })} />
        <textarea aria-label="Document content" maxLength={250000} placeholder="Plain text or markdown content" value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })} required />
        <div className="row"><button disabled={busy}>{busy ? 'Indexing…' : draft.id ? 'Save changes' : 'Create + index'}</button>{draft.id && <button type="button" className="danger" disabled={busy} onClick={() => remove(draft.id!)}>Delete</button>}</div>
        {error && <p className="error" role="alert">{error}</p>}
      </form>
    </section>
  );
}
