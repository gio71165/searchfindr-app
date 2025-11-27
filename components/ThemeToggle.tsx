'use client';

import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const saved = window.localStorage.getItem('theme');

    // If nothing saved yet, fall back to system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initial: 'light' | 'dark' =
      saved === 'light' || saved === 'dark'
        ? (saved as 'light' | 'dark')
        : prefersDark
        ? 'dark'
        : 'light';

    setTheme(initial);
    document.documentElement.classList.toggle('dark', initial === 'dark');
  }, []);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    window.localStorage.setItem('theme', next);
  };

  return (
    <button
      onClick={toggle}
      className="rounded-md border px-2 py-1 text-xs font-medium border-black text-black bg-white"
    >
      {theme === 'dark' ? 'Light mode' : 'Dark mode'}
    </button>
  );
}
