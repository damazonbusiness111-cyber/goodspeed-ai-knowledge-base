import { supabase } from './supabase';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(`${API_URL}/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || `Request failed: ${response.status}`);
  }
  return response.json();
}
