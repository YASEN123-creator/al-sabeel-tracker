'use client';

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';

// Check if Supabase is configured with real credentials
function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return !!(url && key && !url.includes('placeholder') && !key.includes('placeholder') && key.length > 50);
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      // Offline mode: use localStorage for auth
      try {
        const savedUser = localStorage.getItem('sabeel_offline_user');
        if (savedUser) {
          const parsed = JSON.parse(savedUser);
          // Create a minimal User-like object
          const fakeUser = {
            id: parsed.id,
            email: parsed.email || null,
            aud: 'authenticated',
            role: 'authenticated',
            app_metadata: {},
            user_metadata: { name: parsed.name || 'Guest' },
            created_at: parsed.created_at || new Date().toISOString(),
          } as User;
          setUser(fakeUser);
        } else {
          // Create a new offline user automatically
          const newUserId = generateUUID();
          const newUser = {
            id: newUserId,
            email: null,
            created_at: new Date().toISOString(),
          };
          localStorage.setItem('sabeel_offline_user', JSON.stringify(newUser));
          const fakeUser = {
            id: newUserId,
            email: null,
            aud: 'authenticated',
            role: 'authenticated',
            app_metadata: {},
            user_metadata: { name: 'Guest' },
            created_at: new Date().toISOString(),
          } as User;
          setUser(fakeUser);
        }
      } catch {
        // If localStorage fails, create a temporary user
        const tempId = generateUUID();
        const fakeUser = {
          id: tempId,
          email: null,
          aud: 'authenticated',
          role: 'authenticated',
          app_metadata: {},
          user_metadata: { name: 'Guest' },
          created_at: new Date().toISOString(),
        } as User;
        setUser(fakeUser);
      }
      setLoading(false);
      return;
    }

    // Online mode: use Supabase
    import('@/lib/supabase').then(({ supabase }) => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        setLoading(false);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          setUser(session?.user ?? null);
          setLoading(false);
        }
      );

      return () => subscription.unsubscribe();
    });
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured()) {
      throw new Error('التطبيق يعمل في الوضع الأوفلاين. لا يمكن تسجيل الدخول بحساب.');
    }
    const { supabase } = await import('@/lib/supabase');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    if (!isSupabaseConfigured()) {
      throw new Error('التطبيق يعمل في الوضع الأوفلاين. لا يمكن إنشاء حساب.');
    }
    const { supabase } = await import('@/lib/supabase');
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
      },
    });
    if (error) throw error;
  };

  const resetPassword = async (email: string) => {
    if (!isSupabaseConfigured()) {
      throw new Error('التطبيق يعمل في الوضع الأوفلاين.');
    }
    const { supabase } = await import('@/lib/supabase');
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback`,
    });
    if (error) throw error;
  };

  const signInAsGuest = async () => {
    if (!isSupabaseConfigured()) {
      // Offline mode: just use/create the offline user
      try {
        const newUserId = generateUUID();
        const newUser = {
          id: newUserId,
          email: null,
          created_at: new Date().toISOString(),
        };
        localStorage.setItem('sabeel_offline_user', JSON.stringify(newUser));
        const fakeUser = {
          id: newUserId,
          email: null,
          aud: 'authenticated',
          role: 'authenticated',
          app_metadata: {},
          user_metadata: { name: 'Guest' },
          created_at: new Date().toISOString(),
        } as User;
        setUser(fakeUser);
      } catch {
        // fallback
      }
      return;
    }

    // Online mode: use Supabase anonymous auth
    const { supabase } = await import('@/lib/supabase');
    try {
      const { error } = await supabase.auth.signInAnonymously();
      if (!error) return;
    } catch {
      // Fall through
    }

    throw new Error('فشل في الدخول كضيف. حاول مرة أخرى.');
  };

  const signOut = async () => {
    if (!isSupabaseConfigured()) {
      // Offline mode: clear the offline user
      try {
        localStorage.removeItem('sabeel_offline_user');
      } catch { /* ignore */ }
      setUser(null);
      return;
    }
    const { supabase } = await import('@/lib/supabase');
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return { user, loading, signIn, signUp, signInAsGuest, signOut, resetPassword };
}
