import Image from 'next/image';
import { useState, useEffect } from 'react';
import Link from 'next/link';

// Generate a fingerprint for tracking free tier usage
function generateFingerprint() {
  if (typeof window === 'undefined') return '';
  
  // Try to get existing fingerprint
  let fingerprint = localStorage.getItem('ie_fingerprint');
  if (fingerprint) return fingerprint;
  
  // Create new fingerprint from browser characteristics
  const components = [
    navigator.userAgent,
    screen.width + 'x' + screen.height,
    navigator.language,
    new Date().getTimezoneOffset(),
    Math.random().toString(36).substring(2, 15) // Random component
  ];
  
  fingerprint = btoa(components.join('|')).substring(0, 32);
  localStorage.setItem('ie_fingerprint', fingerprint);
  return fingerprint;
}

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState('');
  const [processing, setProcessing] = useState(false);
  const [style, setStyle] = useState('realistic');
  const [error, setError] = useState('');
  const [credits, setCredits] = useState(0);
  const [freeUsed, setFreeUsed] = useState(0);
  const [fingerprint, setFingerprint] = useState('');
  const [showCreditPrompt, setShowCreditPrompt] = useState(false);

  const styles = [
    { id: 'realistic', label: 'REALISTIC' },
    { id: 'illustration', label: 'ILLUSTRATION' },
    { id: 'silhouette', label: 'SILHOUETTE' },
  ];

  // Initialize on mount
  useEffect(() => {
    const fp = generateFingerprint();
    setFingerprint(fp);
    
    // Load credits from localStorage
    const storedCredits = localStorage.getItem('ie_credits');
    if (storedCredits) {
      setCredits(parseInt(storedCredits, 10));
    }
    
    // Load free tier usage
    const storedFreeUsed = localStorage.getItem('ie_free_used');
    if (storedFreeUsed) {
      setFreeUsed(parseInt(storedFreeUsed, 10));
    }
  }, []);

  async function generate() {
    if (prompt.length < 3) {
      setError('ENTER A PROMPT');
      return;
    }
    
    // Check if user has credits before attempting
    const totalAvailable = credits + (3 - freeUsed);
    if (totalAvailable < 1) {
      setShowCreditPrompt(true);
      return;
    }
    
    setResult('');
    setProcessing(true);
    setError('');
    setShowCreditPrompt(false);
    
    try {
      const res = await fetch('/api/getEntourage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt, 
          style,
          fingerprint,
          credits
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        if (data.code === 'NO_CREDITS') {
          setShowCreditPrompt(true);
          throw new Error('No credits remaining');
        }
        throw new Error(data.error || 'Generation failed');
      }
      
      setResult(data.url);
      
      // Update credits based on response
      if (data.isFreeTier) {
        // Used free tier
        const newFreeUsed = data.freeTierUsed || freeUsed + 1;
        setFreeUsed(newFreeUsed);
        localStorage.setItem('ie_free_used', newFreeUsed.toString());
      } else if (!data.isAdmin) {
        // Used paid credits
        const newCredits = data.remainingCredits || credits - 1;
        setCredits(newCredits);
        localStorage.setItem('ie_credits', newCredits.toString());
      }
      // Admin generations don't deduct credits
      
    } catch (e) {
      setError(e.message || 'ERROR');
    }
    setProcessing(false);
  }

  // Calculate total available credits
  const freeRemaining = Math.max(0, 3 - freeUsed);
  const totalCredits = credits + freeRemaining;

  return (
    <div className="min-h-screen bg-white text-black font-mono">
      {/* HEADER */}
      <header className="border-b-4 border-black p-4 md:p-6">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <Link href="/" className="text-2xl md:text-4xl font-black tracking-tighter hover:bg-black hover:text-white px-2">
            INFINITE ENTOURAGE
          </Link>
          <div className="flex items-center gap-4">
            {/* Credit counter */}
            <div className="flex items-center gap-2 border-2 border-black px-3 py-2">
              <span className="text-base md:text-lg font-bold">{totalCredits}</span>
              <span className="text-sm text-gray-600">CREDITS</span>
              {freeRemaining > 0 && (
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1">
                  {freeRemaining} FREE
                </span>
              )}
            </div>
            <Link href="/credits" className="text-base md:text-xl font-bold border-2 border-black px-3 md:px-4 py-2 hover:bg-black hover:text-white transition">
              BUY MORE
            </Link>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="max-w-4xl mx-auto p-4 md:p-6">
        
        {/* CREDIT PROMPT - Show when out of credits */}
        {showCreditPrompt && (
          <div className="mb-8 border-4 border-yellow-500 bg-yellow-50 p-6">
            <h2 className="text-2xl font-black mb-4">🎉 YOU'VE USED ALL YOUR FREE CREDITS!</h2>
            <p className="text-lg mb-4">
              You've generated 3 free images. Ready to create more?
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link 
                href="/credits" 
                className="text-center text-xl font-black py-4 border-4 border-black bg-black text-white hover:bg-white hover:text-black transition"
              >
                BUY CREDITS →
              </Link>
              <button
                onClick={() => setShowCreditPrompt(false)}
                className="text-center text-xl font-bold py-4 border-4 border-black hover:bg-black hover:text-white transition"
              >
                MAYBE LATER
              </button>
            </div>
          </div>
        )}

        {/* HERO */}
        <div className="mb-12 border-4 border-black p-6 md:p-8">
          <h1 className="text-4xl md:text-6xl font-black mb-4 leading-none">
            GENERATE<br/>TRANSPARENT<br/>ENTOURAGE
          </h1>
          <p className="text-lg md:text-xl font-bold">
            AI-GENERATED ASSETS FOR ARCHITECTURAL RENDERINGS
          </p>
          <p className="text-sm md:text-base mt-2 text-gray-600">
            PEOPLE • ANIMALS • VEHICLES • PLANTS • OBJECTS
          </p>
        </div>

        {/* EXAMPLES */}
        <div className="mb-8 border-4 border-black p-4 md:p-6">
          <h2 className="text-xl md:text-2xl font-black mb-4">EXAMPLE PROMPTS</h2>
          <p className="text-sm text-gray-600 mb-3 font-bold">CLICK AN EXAMPLE TO USE IT</p>
          <ul className="space-y-1 text-base md:text-lg font-bold">
            <li 
              className="cursor-pointer hover:bg-black hover:text-white p-2"
              onClick={() => setPrompt('businessman walking with briefcase')}
            >
              → BUSINESSMAN WALKING WITH BRIEFCASE
            </li>
            <li 
              className="cursor-pointer hover:bg-black hover:text-white p-2"
              onClick={() => setPrompt('red road bicycle side view')}
            >
              → RED ROAD BICYCLE SIDE VIEW
            </li>
            <li 
              className="cursor-pointer hover:bg-black hover:text-white p-2"
              onClick={() => setPrompt('elderly woman sitting on bench reading newspaper')}
            >
              → ELDERLY WOMAN SITTING ON BENCH READING NEWSPAPER
            </li>
          </ul>
          <p className="text-xs text-gray-500 mt-3">
            TIP: DESCRIBE THE SUBJECT AND ACTION. AVOID BACKGROUNDS LIKE "ON STREET" OR "AGAINST WALL" — THEY MAKE BACKGROUND REMOVAL HARDER.
          </p>
        </div>

        {/* INPUT */}
        <div className="mb-8">
          <label className="block text-xl md:text-2xl font-bold mb-4">
            WHAT DO YOU NEED?
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="person, dog, car, tree, bench, bicycle, etc..."
            className="w-full text-lg md:text-xl p-4 border-4 border-black font-mono resize-none h-32 focus:outline-none focus:bg-black focus:text-white transition"
          />
        </div>

        {/* STYLE */}
        <div className="mb-8">
          <label className="block text-lg md:text-xl font-bold mb-4">STYLE</label>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            {styles.map((s) => (
              <button
                key={s.id}
                onClick={() => setStyle(s.id)}
                className={`text-lg md:text-xl font-bold px-4 md:px-6 py-2 md:py-3 border-4 border-black transition ${
                  style === s.id 
                    ? 'bg-black text-white' 
                    : 'hover:bg-black hover:text-white'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* GENERATE */}
        <button
          onClick={generate}
          disabled={processing || totalCredits < 1}
          className="w-full text-xl md:text-3xl font-black py-4 md:py-6 border-4 border-black bg-black text-white hover:bg-white hover:text-black transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {processing 
            ? 'GENERATING...' 
            : totalCredits < 1 
              ? 'NO CREDITS - BUY MORE'
              : result 
                ? 'GENERATE AGAIN' 
                : 'GENERATE'}
        </button>

        {error && (
          <div className="mt-4 p-3 md:p-4 border-4 border-black bg-red-500 text-white font-bold text-base md:text-xl">
            {error}
          </div>
        )}

        {/* RESULT - Static container to prevent layout shift */}
        <div className="mt-8 md:mt-12 min-h-[500px]">
          {processing && (
            <div className="flex justify-center h-32 items-center">
              <div className="text-xl md:text-2xl font-bold animate-pulse">LOADING...</div>
            </div>
          )}

          {result && !processing && (
            <div className="border-4 border-black p-3 md:p-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 border-b-2 border-black pb-2 gap-2">
                <span className="text-lg md:text-xl font-bold">YOUR IMAGE</span>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button 
                    onClick={async () => {
                      try {
                        const response = await fetch(result);
                        const blob = await response.blob();
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `entourage-${Date.now()}.png`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      } catch (err) {
                        console.error('Download failed:', err);
                        window.open(result, '_blank');
                      }
                    }}
                    className="flex-1 sm:flex-none text-base md:text-xl font-bold border-2 border-black px-3 md:px-4 py-1 hover:bg-black hover:text-white"
                  >
                    DOWNLOAD ↓
                  </button>
                  <button 
                    onClick={() => window.open(result, '_blank')}
                    className="flex-1 sm:flex-none text-base md:text-xl font-bold border-2 border-black px-3 md:px-4 py-1 hover:bg-black hover:text-white text-center"
                  >
                    OPEN ↗
                  </button>
                </div>
              </div>
              <div className="flex justify-center bg-[url('/checkerboard.png')] bg-contain min-h-[400px]">
                <Image
                  src={result}
                  alt="Generated"
                  width={400}
                  height={500}
                  className="max-w-full h-auto"
                />
              </div>
            </div>
          )}
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
