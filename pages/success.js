import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Success() {
  const [credits, setCredits] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    
    if (sessionId) {
      // Verify session and get credits from metadata
      fetch(`/api/verify-session?session_id=${sessionId}`)
        .then(res => res.json())
        .then(data => {
          if (data.credits) {
            // Add credits to localStorage
            const currentCredits = parseInt(localStorage.getItem('ie_credits') || '0', 10);
            const newTotal = currentCredits + data.credits;
            localStorage.setItem('ie_credits', newTotal.toString());
            setCredits(data.credits);
          }
          setLoading(false);
        })
        .catch(err => {
          console.error('Failed to verify session:', err);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-white text-black font-mono p-6">
      <header className="border-b-4 border-black p-6 mb-8">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <Link href="/" className="text-4xl font-black tracking-tighter hover:bg-black hover:text-white px-2">
            INFINITE ENTOURAGE
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto text-center">
        {loading ? (
          <div className="text-2xl font-bold">Verifying purchase...⏳</div>
        ) : credits ? (
          <>
            <div className="text-6xl mb-4">🎉</div>
            <h1 className="text-4xl font-black mb-4">PAYMENT SUCCESSFUL!</h1>
            <p className="text-xl mb-8">
              Added <strong>{credits} credits</strong> to your account.
            </p>
            <Link
              href="/"
              className="inline-block text-xl font-black py-4 px-8 border-4 border-black bg-black text-white hover:bg-white hover:text-black transition"
            >
              START GENERATING →
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-4xl font-black mb-4">ALMOST THERE!</h1>
            <p className="text-xl mb-8">
              Your payment was received. Credits have been added to your account.
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
    </div>
  );
}
