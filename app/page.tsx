'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from './supabaseClient';

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
      }

      router.push('/dashboard');
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex flex-col items-center justify-center py-20">
      <div className="w-full max-w-md rounded-lg border border-slate-800 bg-slate-900/70 p-6 shadow-lg">
        <h1 className="text-center text-2xl font-semibold">
          {mode === 'login' ? 'Log In' : 'Sign Up'}
        </h1>

        <div className="my-4 flex gap-2">
          <button
            className={`flex-1 rounded-md px-3 py-2 text-sm ${mode === 'login' ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-300'}`}
            onClick={() => setMode('login')}
          >
            Log In
          </button>

          <button
            className={`flex-1 rounded-md px-3 py-2 text-sm ${mode === 'signup' ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-300'}`}
            onClick={() => setMode('signup')}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300">Email</label>
            <input
              type="email"
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-indigo-400"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm text-slate-300">Password</label>
            <input
              type="password"
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-indigo-400"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {errorMsg && <p className="text-sm text-red-400">{errorMsg}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-indigo-500 py-2 text-white hover:bg-indigo-400 disabled:opacity-50"
          >
            {loading ? 'Please wait…' : mode === 'login' ? 'Log In' : 'Sign Up'}
          </button>
        </form>
      </div>
    </main>
  );
}
