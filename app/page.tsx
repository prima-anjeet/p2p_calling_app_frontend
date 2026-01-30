// Why: Landing page with clear Call to Actions.
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

  if (!mounted) return null; // Avoid hydration mismatch

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-black text-white selection:bg-pink-500 selection:text-white">
       <nav className="flex justify-between items-center p-6 max-w-7xl mx-auto">
          <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-violet-500">
             StreamCall
          </div>
          <div className="space-x-4">
             <Link href="/login" className="px-5 py-2 rounded-full hover:bg-white/10 transition">Login</Link>
             <Link href="/signup" className="px-5 py-2 rounded-full bg-white text-indigo-900 font-semibold hover:bg-gray-100 transition shadow-lg shadow-white/10">Sign Up</Link>
          </div>
       </nav>

       <main className="flex flex-col items-center justify-center text-center mt-20 px-4">
          <div className="inline-block px-4 py-1.5 mb-6 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-sm font-medium">
             ✨ Experience the future of connection
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8">
             Connect properly <br />
             <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500">
                Anytime, Anywhere.
             </span>
          </h1>
          <p className="max-w-2xl text-lg text-gray-300 mb-10 leading-relaxed">
             Crystal clear video, HD audio, and zero lag. Start your conversation today with the most reliable P2P calling platform built for the modern web.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
             <Link href="/signup" className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full font-bold text-lg hover:from-indigo-700 hover:to-purple-700 transition transform hover:scale-105 shadow-xl shadow-indigo-600/20">
                Get Started Free
             </Link>
             <Link href="/login" className="px-8 py-4 bg-white/5 border border-white/10 rounded-full font-bold text-lg hover:bg-white/10 transition backdrop-blur-sm">
                Login to Account
             </Link>
          </div>

          <div className="mt-20 relative w-full max-w-4xl aspect-video rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-indigo-500/20 bg-gray-900/50 backdrop-blur-xl">
             <div className="absolute inset-0 flex items-center justify-center text-gray-500 font-mono text-sm">
                [High Quality Video Preview Placeholder]
             </div>
             {/* Decorative blobs */}
             <div className="absolute -top-20 -left-20 w-64 h-64 bg-purple-600/30 rounded-full blur-3xl"></div>
             <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-pink-600/30 rounded-full blur-3xl"></div>
          </div>
       </main>
    </div>
  );
}