import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from '@supabase/auth-helpers-react';

// Map package amounts to Stripe price IDs from env
const PRICE_ID_MAP = {
  20: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER,
  75: process.env.NEXT_PUBLIC_STRIPE_PRICE_STANDARD,
  150: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO,
};

const CREDIT_PACKAGES = [
  { id: 20, amount: 20, price: '$5.00', pricePerCredit: '$0.25' },
  { id: 75, amount: 75, price: '$15.00', pricePerCredit: '$0.20', savings: 'SAVE 20%' },
  { id: 150, amount: 150, price: '$25.00', pricePerCredit: '$0.17', savings: 'BEST VALUE • SAVE 33%' },
];

export default function Credits() {
  const session = useSession();
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('canceled')) setMessage('Purchase canceled. Your credits are unchanged.');

    if (session) {
      fetch('/api/get-credits', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      })
        .then(r => r.json())
        .then(data => {
          setCredits(data.credits || 0);
        })
        .catch(() => {});
    }
  }, [session]);

  const handlePurchase = async (creditPackage) => {
    // Get price ID from environment mapping
    const priceId = PRICE_ID_MAP[creditPackage.amount];
    
    if (!priceId) {
      setMessage('Error: Price not configured');
      return;
    }
    
    setLoading(creditPackage.id);
    setMessage('');

    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({
          priceId: priceId,
          credits: creditPackage.amount,
        }),
      });

      const data = await res.json();

      if (data.error) {
        setMessage('Error: ' + data.error);
      } else if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      }
    } catch (err) {
      setMessage('Purchase failed: ' + err.message);
    }

    setLoading(null);
  };

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

      <main className="max-w-4xl mx-auto p-4 md:p-6">
        <h1 className="text-4xl font-black mb-6">CREDITS</h1>

        <div className="border-4 border-black p-6 mb-8">
          <div className="text-6xl font-black mb-2">{credits}</div>
          <div className="text-xl font-bold">CREDITS REMAINING</div>
        </div>

        {message && (
          <div className={`mb-6 p-4 border-4 ${message.includes('Error') || message.includes('canceled') ? 'border-red-500 bg-red-50' : 'border-green-500 bg-green-50'}`}>
            <p className="font-bold">{message}</p>
          </div>
        )}

        <p className="text-lg mb-8">
          Each image generation costs <strong>1 credit</strong>. 
          Get transparent, background-free entourage for your architectural renderings.
        </p>

        <h2 className="text-2xl font-black mb-4">BUY CREDITS</h2>

        <div className="grid gap-4 mb-8">
          {CREDIT_PACKAGES.map((pkg) => (
            <button
              key={pkg.id}
              onClick={() => handlePurchase(pkg)}
              disabled={loading === pkg.id}
              className="border-4 border-black p-6 text-left hover:bg-black hover:text-white transition disabled:opacity-50"
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-2xl font-black">{pkg.amount} CREDITS</div>
                  <div className="text-lg">{pkg.price} <span className="text-sm text-gray-500">({pkg.pricePerCredit}/credit)</span></div>
                </div>
                {pkg.savings && (
                  <div className="text-green-600 font-bold text-right">
                    {pkg.savings}
                  </div>
                )}
              </div>
              {loading === pkg.id && (
                <div className="mt-2 text-sm">Loading...⏳</div>
              )}
            </button>
          ))}
        </div>

        <div className="border-4 border-gray-300 p-4 text-sm text-gray-600">
          <p className="font-bold mb-2">HOW IT WORKS:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Each generation creates 1 transparent PNG</li>
            <li>Credits never expire</li>
            <li>Secure payment via Stripe</li>
          </ul>
        </div>

        <div className="mt-8 flex gap-4">
          <Link 
            href="/" 
            className="flex-1 text-center text-xl font-bold py-4 border-4 border-black hover:bg-black hover:text-white transition"
          >
            ← BACK TO GENERATOR
          </Link>
        </div>
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
