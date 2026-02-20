import { useState, useEffect } from 'react';
import Link from 'next/link';

// Map package amounts to Stripe price IDs from env
const PRICE_ID_MAP = {
  10: process.env.NEXT_PUBLIC_STRIPE_PRICE_10,
  50: process.env.NEXT_PUBLIC_STRIPE_PRICE_50,
  100: process.env.NEXT_PUBLIC_STRIPE_PRICE_100,
};

const CREDIT_PACKAGES = [
  { id: 10, amount: 10, price: '$1.00', priceIdEnv: 'NEXT_PUBLIC_STRIPE_PRICE_10' },
  { id: 50, amount: 50, price: '$5.00', priceIdEnv: 'NEXT_PUBLIC_STRIPE_PRICE_50' },
  { id: 100, amount: 100, price: '$10.00', savings: 'BEST VALUE', priceIdEnv: 'NEXT_PUBLIC_STRIPE_PRICE_100' },
];

export default function Credits() {
  const [credits, setCredits] = useState(0);
  const [freeUsed, setFreeUsed] = useState(0);
  const [loading, setLoading] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Load credits from localStorage
    const stored = localStorage.getItem('ie_credits');
    if (stored) {
      setCredits(parseInt(stored, 10));
    }
    
    const storedFree = localStorage.getItem('ie_free_used');
    if (storedFree) {
      setFreeUsed(parseInt(storedFree, 10));
    }
    
    // Check for success/canceled params
    const params = new URLSearchParams(window.location.search);
    if (params.get('success')) {
      const purchased = params.get('credits');
      if (purchased) {
        const newCredits = credits + parseInt(purchased, 10);
        setCredits(newCredits);
        localStorage.setItem('ie_credits', newCredits.toString());
        setMessage(`🎉 Added ${purchased} credits!`);
      }
    } else if (params.get('canceled')) {
      setMessage('Purchase canceled. Your credits are unchanged.');
    }
  }, []);

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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: priceId,
          credits: creditPackage.amount,
          userId: 'anonymous',
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

  const freeRemaining = Math.max(0, 3 - freeUsed);
  const totalCredits = credits + freeRemaining;

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
          <div className="text-6xl font-black mb-2">{totalCredits}</div>
          <div className="text-xl font-bold">CREDITS REMAINING</div>
          {freeRemaining > 0 && (
            <div className="mt-2 text-green-600 font-bold">
              Includes {freeRemaining} free credits
            </div>
          )}
          {credits > 0 && (
            <div className="mt-2 text-gray-600">
              {credits} purchased credits
            </div>
          )}
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
                  <div className="text-lg">{pkg.price}</div>
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
            <li>New users get <strong>3 free credits</strong> to try it out</li>
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
