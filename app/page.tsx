'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useAuth from '../app/hooks/useAuth';

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-white-800 selection:bg-pink-500 selection:text-white">
       <nav className="flex justify-between items-center p-6 max-w-7xl mx-auto border-b border-gray-200">
          <div className="text-2xl font-bold bg-clip-text">
             P2P Connect
          </div>
          <div className="space-x-4">
             <Link href="/login" className="px-5 py-2 rounded-full hover:bg-black/10 transition">Login</Link>
             <Link href="/signup" className="px-5 py-2 rounded-full bg-white text-indigo-900 font-semibold hover:bg-gray-200 transition shadow-lg shadow-white/10">Sign Up</Link>
          </div>
       </nav>
       <main className="flex flex-col items-center justify-center text-center mt-20 px-4">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8">
             Connect properly <br />
           
                Anytime, Anywhere.

          </h1>
          <p className="max-w-2xl text-lg text-black-300 mb-10 leading-relaxed">
             Crystal clear video, HD audio, and zero lag. Start your conversation today with the most reliable P2P calling platform built for the modern web.
          </p>
       </main>
    </div>
  );
}