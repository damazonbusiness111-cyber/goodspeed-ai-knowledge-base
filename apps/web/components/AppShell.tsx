'use client';

import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { AuthPanel } from './AuthPanel';
import { DocumentWorkspace } from './DocumentWorkspace';
import { ChatPanel } from './ChatPanel';

export function AppShell() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  if (!ready) return <main className="loading">Loading…</main>;
  if (!session) return <AuthPanel />;

  return (
    <main className="appShell">
      <header className="topbar"><div><div className="eyebrow">AI-powered knowledge base</div><h1>Document intelligence workspace</h1></div><div className="userBlock"><span>{session.user.email}</span><button className="ghost compact" onClick={() => supabase.auth.signOut()}>Sign out</button></div></header>
      <div className="workspace"><DocumentWorkspace /><ChatPanel /></div>
    </main>
  );
}
