import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Account() {
  const session = useSession();
  const supabase = useSupabaseClient();
  const router = useRouter();
  const [credits, setCredits] = useState(null);
  const [freeRemaining, setFreeRemaining] = useState(null);

  useEffect(() => {
    if (session === undefined) return;
    if (!session) { router.push('/login'); return; }

    fetch('/api/get-credits', {
      headers: { 'Authorization': `Bearer ${session.access_token}` },
    })
      .then(r => r.json())
      .then(data => {
        setCredits(data.credits || 0);
        setFreeRemaining(data.freeRemaining || 0);
      })
      .catch(() => {});
  }, [session]);

  if (!session) return null;

  return (
    <div className="min-h-screen bg-white text-black font-mono">
      <header className="border-b-4 border-black p-4 md:p-6">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <Link href="/" className="text-2xl md:text-4xl font-black tracking-tighter hover:bg-black hover:text-white px-2">
            INFINITE ENTOURAGE
          </Link>
          <Link href="/" className="text-base md:text-xl font-bold border-2 border-black px-3 md:px-4 py-2 hover:bg-black hover:text-white transition">
            ← BACK
          </Link>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-6 mt-8">
        <h1 className="text-3xl font-black mb-8">ACCOUNT</h1>

        <div className="border-4 border-black p-6 mb-6">
          <div className="text-sm text-gray-500 font-bold mb-1">EMAIL</div>
          <div className="text-lg font-bold">{session.user.email}</div>
        </div>

        <div className="border-4 border-black p-6 mb-6">
          <div className="text-sm text-gray-500 font-bold mb-1">CREDITS</div>
          <div className="text-5xl font-black">{credits ?? '...'}</div>
          {freeRemaining > 0 && (
            <div className="text-green-600 font-bold mt-2">+ {freeRemaining} free remaining</div>
          )}
          <Link href="/credits" className="inline-block mt-4 text-base font-bold border-2 border-black px-4 py-2 hover:bg-black hover:text-white transition">
            BUY MORE CREDITS
          </Link>
        </div>

        <button
          onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
          className="w-full text-xl font-bold py-3 border-4 border-black hover:bg-black hover:text-white transition"
        >
          SIGN OUT
        </button>
      </main>
    </div>
  );
}
