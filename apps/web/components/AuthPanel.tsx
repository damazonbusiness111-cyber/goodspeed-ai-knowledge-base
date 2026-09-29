'use client';

import { FormEvent, useState } from 'react';
import { supabase } from '../lib/supabase';

export function AuthPanel() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [message, setMessage] = useState('');
  const [messageIsError, setMessageIsError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage('');
    setMessageIsError(false);
    setBusy(true);
    try {
      const result = mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
      if (result.error) {
        setMessageIsError(true);
        setMessage(result.error.message);
      } else if (mode === 'signup' && !result.data.session) {
        setMessage('Check your email to confirm your account.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="authShell">
      <form className="authCard" onSubmit={submit}>
        <div className="eyebrow">Goodspeed technical assessment</div>
        <h1>AI Knowledge Base</h1>
        <p>Private documents, retrieval, and grounded AI chat.</p>
        <label>Email<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required /></label>
        <label>Password<input value={password} onChange={(e) => setPassword(e.target.value)} type="password" minLength={6} required /></label>
        <button type="submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}</button>
        <button type="button" className="ghost" disabled={busy} onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
          {mode === 'signin' ? 'Need an account?' : 'Already have an account?'}
        </button>
        {message && <p className={messageIsError ? 'error' : 'message'} role={messageIsError ? 'alert' : 'status'}>{message}</p>}
      </form>
    </main>
  );
}
