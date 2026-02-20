import { useState, useEffect } from 'react';
import Link from 'next/link';
import { loadStripe } from '@stripe/stripe-js';
import { getCredits, deductCredit, addCredits } from '../utils/supabase';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

export default function Credits() {
  const [credits, setCredits] = useState(5);
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState(null);

  useEffect(() => {
    // Load credits from localStorage (demo mode)
    const stored = localStorage.getItem('credits');
    if (stored) {
      setCredits(parseInt(stored, 10));
    }
  }, []);

  const handlePurchase = async (creditsAmount, priceId) => {
    if (!priceId) {
      alert('Stripe not configured. Set STRIPE_CREDITS_PRICE_ID in .env.local');
      return;
    }

    setPurchasing(creditsAmount);
    setLoading(true);

    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId,
          credits: creditsAmount,
          userId: 'demo-user'
        }),
      });

      const { url, error } = await res.json();

      if (error) {
        alert(error);
      } else if (url) {
        // For demo mode, just add credits directly
        const newCredits = credits + creditsAmount;
        setCredits(newCredits);
        localStorage.setItem('credits', newCredits.toString());
        alert(`Added ${creditsAmount} credits! (Demo mode - no real payment)`);
      }
    } catch (err) {
      alert('Purchase failed: ' + err.message);
    }

    setLoading(false);
    setPurchasing(null);
  };

  return (
    <div className="min-h-screen bg-white text-black font-mono p-6">
      <header className="border-b-4 border-black p-6 mb-8">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <Link href="/" className="text-4xl font-black tracking-tighter">
            INFINITE ENTOURAGE
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-black mb-6">CREDITS</h1>

        <div className="border-4 border-black p-6 mb-8">
          <div className="text-6xl font-black mb-2">{credits}</div>
          <div className="text-xl font-bold">CREDITS REMAINING</div>
        </div>

        <p className="text-lg mb-8">
          Each image generation costs <strong>1 credit</strong>. 
          Transparent background costs <strong>1 extra credit</strong>.
        </p>

        <h2 className="text-2xl font-black mb-4">BUY CREDITS</h2>

        <div className="grid gap-4 mb-8">
          <button
            onClick={() => handlePurchase(5, process.env.NEXT_PUBLIC_STRIPE_PRICE_5)}
            disabled={loading}
            className="border-4 border-black p-6 text-left hover:bg-black hover:text-white transition disabled:opacity-50"
          >
            <div className="text-2xl font-black">5 CREDITS</div>
            <div className="text-lg">$5.00</div>
          </button>

          <button
            onClick={() => handlePurchase(10, process.env.NEXT_PUBLIC_STRIPE_PRICE_10)}
            disabled={loading}
            className="border-4 border-black p-6 text-left hover:bg-black hover:text-white transition disabled:opacity-50"
          >
            <div className="text-2xl font-black">10 CREDITS</div>
            <div className="text-lg">$10.00 <span className="text-green-600">(SAVE 10%)</span></div>
          </button>

          <button
            onClick={() => handlePurchase(25, process.env.NEXT_PUBLIC_STRIPE_PRICE_25)}
            disabled={loading}
            className="border-4 border-black p-6 text-left hover:bg-black hover:text-white transition disabled:opacity-50"
          >
            <div className="text-2xl font-black">25 CREDITS</div>
            <div className="text-lg">$20.00 <span className="text-green-600">(SAVE 20%)</span></div>
          </button>
        </div>

        <p className="text-sm text-gray-600">
          Demo mode: Credits are stored locally. In production, Stripe checkout would process real payments.
        </p>
      </main>
    </div>
  );
}
