import { useEffect, useState } from 'react';
import Link from 'next/link';
import SiteHeader from '../components/SiteHeader';
import { useSession } from '@supabase/auth-helpers-react';

export default function Success() {
  const session = useSession();
  const [credits, setCredits] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (session === undefined) return; // Still loading session

    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');

    if (!sessionId) { setLoading(false); return; }
    if (!session) { window.location.href = '/login?redirect=/success?session_id=' + sessionId; return; }

    fetch(`/api/verify-session?session_id=${sessionId}`, {
      headers: { 'Authorization': `Bearer ${session.access_token}` },
    })
      .then(res => res.json())
      .then(data => {
        if (data.credits !== undefined) {
          setCredits(data.credits);
          setTimeout(() => { window.location.href = '/'; }, 3000);
        } else if (data.error) {
          setError(data.error);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to verify session:', err);
        setError('Failed to verify payment. Credits may still be added.');
        setLoading(false);
      });
  }, [session]);

  return (
    <div className="min-h-screen bg-white text-black font-mono">
      <SiteHeader>
        <Link href="/" className="text-sm md:text-base font-bold border-2 border-black px-2 md:px-3 py-1 md:py-2 hover:bg-black hover:text-white transition">
          ← BACK
        </Link>
      </SiteHeader>

      <main className="max-w-4xl mx-auto p-4 md:p-6 text-center">
        {loading ? (
          <div className="text-2xl font-bold">Verifying purchase...⏳</div>
        ) : error ? (
          <>
            <div className="text-6xl mb-4">✅</div>
            <h1 className="text-4xl font-black mb-4">PAYMENT RECEIVED</h1>
            <p className="text-xl mb-8">
              {error}
            </p>
            <p className="text-gray-600 mb-8">
              Your credits should be available. Try refreshing the page.
            </p>
            <Link
              href="/"
              className="inline-block text-xl font-black py-4 px-8 border-4 border-black bg-black text-white hover:bg-white hover:text-black transition"
            >
              START GENERATING →
            </Link>
          </>
        ) : credits ? (
          <>
            <div className="text-6xl mb-4">🎉</div>
            <h1 className="text-4xl font-black mb-4">PAYMENT SUCCESSFUL!</h1>
            <p className="text-xl mb-4">
              Added <strong>{credits} credits</strong> to your account.
            </p>
            <p className="text-sm text-gray-600 mb-8">
              Redirecting you now...
            </p>
          </>
        ) : (
          <>
            <h1 className="text-4xl font-black mb-4">ALMOST THERE!</h1>
            <p className="text-xl mb-8">
              Your payment was received. Credits are being added to your account.
            </p>
            <Link
              href="/"
              className="inline-block text-xl font-black py-4 px-8 border-4 border-black bg-black text-white hover:bg-white hover:text-black transition"
            >
              START GENERATING →
            </Link>
          </>
        )}
      </main>

      {/* FOOTER */}
      <footer className="border-t-4 border-black p-4 md:p-6 mt-8 md:mt-16">
        <div className="max-w-4xl mx-auto text-center font-bold text-sm md:text-base">
          INFINITE ENTOURAGE • PEOPLE • ANIMALS • VEHICLES • PLANTS • OBJECTS
        </div>
      </footer>
    </div>
  );
}
