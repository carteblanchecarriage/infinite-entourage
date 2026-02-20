import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getOrCreateUser } from '../lib/supabase';

export default function Success() {
  const [credits, setCredits] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    
    if (sessionId) {
      // Get fingerprint for user identification
      const fingerprint = localStorage.getItem('ie_fingerprint') || generateFingerprint();
      
      // Verify session and add credits
      fetch(`/api/verify-session?session_id=${sessionId}&fingerprint=${fingerprint}`)
        .then(res => res.json())
        .then(async (data) => {
          if (data.credits && data.userId) {
            setCredits(data.credits);
            
            // Also update localStorage for display purposes
            const currentCredits = parseInt(localStorage.getItem('ie_credits') || '0', 10);
            const newTotal = currentCredits + data.credits;
            localStorage.setItem('ie_credits', newTotal.toString());
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
    } else {
      setLoading(false);
    }
  }, []);

  // Generate fingerprint if needed
  function generateFingerprint() {
    if (typeof window === 'undefined') return '';
    
    let fingerprint = localStorage.getItem('ie_fingerprint');
    if (fingerprint) return fingerprint;
    
    const components = [
      navigator.userAgent,
      screen.width + 'x' + screen.height,
      navigator.language,
      new Date().getTimezoneOffset(),
      Math.random().toString(36).substring(2, 15)
    ];
    
    fingerprint = btoa(components.join('|')).substring(0, 32);
    localStorage.setItem('ie_fingerprint', fingerprint);
    return fingerprint;
  }

  return (
    <div className="min-h-screen bg-white text-black font-mono">
      <header className="border-b-4 border-black p-4 md:p-6">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <Link href="/" className="text-2xl md:text-4xl font-black tracking-tighter hover:bg-black hover:text-white px-2">
            INFINITE ENTOURAGE
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-base md:text-xl font-bold border-2 border-black px-3 md:px-4 py-2 hover:bg-black hover:text-white transition">
              ← BACK
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-6 text-center">
        {loading ? (
          <div className="text-2xl font-bold">Verifying purchase...⏳</div>
        ) : error ? (
          <>
            <div className="text-6xl mb-4">⚠️</div>
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
              Your credits are now available across all your devices.
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
