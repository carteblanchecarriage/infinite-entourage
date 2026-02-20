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
  const [infiniteMode, setInfiniteMode] = useState(false);
  const [gallery, setGallery] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [feedbackGiven, setFeedbackGiven] = useState({}); // Track which images have feedback

  const styles = [
    { id: 'realistic', label: 'REALISTIC' },
    { id: 'illustration', label: 'ILLUSTRATION' },
    { id: 'silhouette', label: 'SILHOUETTE' },
  ];

  // Initialize on mount
  useEffect(() => {
    const fp = generateFingerprint();
    setFingerprint(fp);
    
    // Load from localStorage first (for immediate display)
    const storedCredits = localStorage.getItem('ie_credits');
    if (storedCredits) {
      setCredits(parseInt(storedCredits, 10));
    }
    
    // Load free tier usage
    const storedFreeUsed = localStorage.getItem('ie_free_used');
    if (storedFreeUsed) {
      setFreeUsed(parseInt(storedFreeUsed, 10));
    }
    
    // Check for infinite mode
    const storedInfinite = localStorage.getItem('ie_infinite_mode');
    if (storedInfinite === 'true') {
      setInfiniteMode(true);
    }
    
    // Load gallery from localStorage
    const storedGallery = localStorage.getItem('ie_gallery');
    if (storedGallery) {
      try {
        setGallery(JSON.parse(storedGallery));
      } catch (e) {
        console.error('Failed to load gallery:', e);
      }
    }
    
    // Load existing feedback
    const storedFeedback = localStorage.getItem('ie_feedback');
    if (storedFeedback) {
      try {
        const feedbackList = JSON.parse(storedFeedback);
        const feedbackMap = {};
        feedbackList.forEach(f => {
          feedbackMap[f.imageId] = f.rating === 'bad' ? 'reported' : 'good';
        });
        setFeedbackGiven(feedbackMap);
      } catch (e) {
        console.error('Failed to load feedback:', e);
      }
    }
    
    // Fetch credits from Supabase (server-side source of truth)
    fetchCredits(fp);
  }, []);
  
  // Fetch credits from Supabase
  const fetchCredits = async (fp) => {
    try {
      const res = await fetch(`/api/get-credits?fingerprint=${fp}`);
      if (res.ok) {
        const data = await res.json();
        setCredits(data.credits || 0);
        setFreeUsed(data.freeUsed || 0);
        // Update localStorage to match
        localStorage.setItem('ie_credits', (data.credits || 0).toString());
        localStorage.setItem('ie_free_used', (data.freeUsed || 0).toString());
      }
    } catch (err) {
      console.error('Failed to fetch credits:', err);
    }
  };

  // Handle prompt changes with secret code detection
  const handlePromptChange = (e) => {
    const value = e.target.value;
    setPrompt(value);
    
    // Secret unlock: type "infinite" to activate unlimited mode
    if (value.toLowerCase().trim() === 'infinite' && !infiniteMode) {
      setInfiniteMode(true);
      localStorage.setItem('ie_infinite_mode', 'true');
      setError('🔓 INFINITE MODE ACTIVATED - Unlimited generations!');
      setTimeout(() => setError(''), 3000);
    }
  };

  async function generate() {
    if (prompt.length < 3) {
      setError('ENTER A PROMPT');
      return;
    }
    
    // Skip credit check if infinite mode is active
    if (!infiniteMode) {
      const totalAvailable = credits + (3 - freeUsed);
      if (totalAvailable < 1) {
        setShowCreditPrompt(true);
        return;
      }
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
          credits,
          infiniteMode
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        if (data.code === 'NO_CREDITS') {
          setShowCreditPrompt(true);
          throw new Error('No credits remaining');
        }
        throw new Error(data.error || 'Something went wrong. Try again?');
      }
      
      setResult(data.url);
      
      // Add to gallery
      const newImage = {
        id: Date.now(),
        url: data.url,
        prompt: prompt,
        style: style,
        timestamp: new Date().toISOString()
      };
      const updatedGallery = [newImage, ...gallery].slice(0, 20); // Keep last 20
      setGallery(updatedGallery);
      localStorage.setItem('ie_gallery', JSON.stringify(updatedGallery));
      
      // Update credits based on response (skip if infinite mode)
      if (!infiniteMode) {
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
      }
      // Admin/infinite generations don't deduct credits
      
    } catch (e) {
      setError(e.message || 'Oops! Something went wrong.');
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
            <div className={`flex items-center gap-2 border-2 border-black px-3 py-2 ${infiniteMode ? 'bg-purple-100 border-purple-500' : ''}`}>
              <span className="text-base md:text-lg font-bold">{infiniteMode ? '∞' : totalCredits}</span>
              <span className="text-sm text-gray-600">{infiniteMode ? 'INFINITE' : 'CREDITS'}</span>
              {!infiniteMode && freeRemaining > 0 && (
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
          <div className="flex flex-col md:flex-row gap-6 items-center">
            <div className="flex-1">
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
            <div className="w-full md:w-64 flex-shrink-0">
              <img
                src="/example-lemon-tree-clay-pot.png"
                alt="Lemon tree in clay pot"
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-2 text-center">lemon tree in a clay pot</p>
            </div>
          </div>
        </div>

        {/* EXAMPLES */}
        <div className="mb-8 border-4 border-black p-4 md:p-6">
          <h2 className="text-xl md:text-2xl font-black mb-4">EXAMPLE PROMPTS</h2>
          <p className="text-sm text-gray-600 mb-3 font-bold">CLICK AN EXAMPLE TO USE IT</p>
          <ul className="space-y-1 text-base md:text-lg font-bold">
            <li 
              className="cursor-pointer hover:bg-black hover:text-white p-2"
              onClick={() => setPrompt('rusty vintage pickup truck side view')}
            >
              → RUSTY VINTAGE PICKUP TRUCK SIDE VIEW
            </li>
            <li 
              className="cursor-pointer hover:bg-black hover:text-white p-2"
              onClick={() => setPrompt('lemon tree in a clay pot')}
            >
              → LEMON TREE IN A CLAY POT
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
          <p className="text-xs text-gray-500 mt-2">
            TIP: FOR PEOPLE, ADD POSE INFO LIKE "WALKING" OR "STANDING". FOR OBJECTS, ADD VIEW LIKE "SIDE VIEW" OR "FRONT VIEW" FOR CLEANER RESULTS.
          </p>
          <p className="text-xs text-gray-500 mt-2">
            TIP: INCLUDE KEY DETAILS IN YOUR FIRST 10 WORDS — "A WOMAN WITH A WATERING CAN" WORKS BETTER THAN JUST "A WOMAN".
          </p>
        </div>

        {/* INPUT */}
        <div className="mb-8">
          <label className="block text-xl md:text-2xl font-bold mb-4">
            WHAT DO YOU NEED?
          </label>
          <textarea
            value={prompt}
            onChange={handlePromptChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                generate();
              }
            }}
            placeholder="person, dog, car, tree, bench, bicycle, etc..."
            className={`w-full text-lg md:text-xl p-4 border-4 border-black font-mono resize-none h-32 focus:outline-none focus:bg-black focus:text-white transition ${infiniteMode ? 'border-purple-500 bg-purple-50' : ''}`}
          />
          {infiniteMode && (
            <p className="text-sm text-purple-600 font-bold mt-2">🔓 INFINITE MODE ACTIVE</p>
          )}
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
        {!infiniteMode && totalCredits < 1 ? (
          <Link
            href="/credits"
            className="block w-full text-xl md:text-3xl font-black py-4 md:py-6 border-4 border-black bg-black text-white hover:bg-white hover:text-black transition text-center"
          >
            NO CREDITS - BUY MORE
          </Link>
        ) : (
          <button
            onClick={generate}
            disabled={processing}
            className={`w-full text-xl md:text-3xl font-black py-4 md:py-6 border-4 border-black bg-black text-white hover:bg-white hover:text-black transition disabled:opacity-50 ${infiniteMode ? 'border-purple-500 bg-purple-600 hover:bg-purple-100 hover:text-purple-600' : ''}`}
          >
            {processing ? 'GENERATING...' : result ? 'GENERATE AGAIN' : infiniteMode ? 'GENERATE (INFINITE)' : 'GENERATE'}
          </button>
        )}

        {error && (
          <div className={`mt-4 p-3 md:p-4 border-4 border-black font-bold text-base md:text-xl ${error.includes('INFINITE') ? 'bg-purple-500 text-white' : 'bg-red-500 text-white'}`}>
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

        {/* GALLERY - Previous generations */}
        {gallery.length > 0 && (
          <div className="mt-12 border-4 border-black p-4 md:p-6">
            <h2 className="text-xl md:text-2xl font-black mb-4">YOUR GENERATIONS ({gallery.length})</h2>
            <p className="text-sm text-gray-600 mb-4">Click a thumbnail to view larger</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {gallery.map((img) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImage(img)}
                  className="relative aspect-square border-2 border-black hover:border-purple-500 overflow-hidden bg-[url('/checkerboard.png')] bg-contain"
                >
                  <img
                    src={img.url}
                    alt={img.prompt}
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black text-white text-xs p-1 truncate">
                    {img.style}
                  </div>
                </button>
              ))}
            </div>          
          </div>
        )}

      </main>

      {/* IMAGE MODAL */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div 
            className="bg-white max-w-4xl w-full max-h-[90vh] overflow-auto border-4 border-black"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b-2 border-black p-4">
              <div className="flex-1 min-w-0 mr-4">
                <p className="font-bold truncate">{selectedImage.prompt}</p>
                <p className="text-sm text-gray-600">{selectedImage.style} • {new Date(selectedImage.timestamp).toLocaleString()}</p>
              </div>
              <button
                onClick={() => setSelectedImage(null)}
                className="text-2xl font-black px-3 py-1 border-2 border-black hover:bg-black hover:text-white"
              >
                ×
              </button>
            </div>
            
            <div className="p-4 flex justify-center bg-[url('/checkerboard.png')] bg-contain">
              <img
                src={selectedImage.url}
                alt={selectedImage.prompt}
                className="max-w-full h-auto max-h-[50vh]"
              />
            </div>
            
            {/* FEEDBACK SECTION */}
            <div className="border-t border-gray-300 p-3 bg-gray-50">
              {!feedbackGiven[selectedImage?.id] ? (
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-2">How did this turn out?</p>
                  <div className="flex justify-center gap-3">
                    <button
                      onClick={() => {
                        const feedback = {
                          imageId: selectedImage.id,
                          prompt: selectedImage.prompt,
                          style: selectedImage.style,
                          rating: 'good',
                          timestamp: new Date().toISOString()
                        };
                        const existing = JSON.parse(localStorage.getItem('ie_feedback') || '[]');
                        localStorage.setItem('ie_feedback', JSON.stringify([...existing, feedback]));
                        setFeedbackGiven({ ...feedbackGiven, [selectedImage.id]: 'good' });
                      }}
                      className="px-4 py-2 border-2 border-green-500 text-green-600 hover:bg-green-500 hover:text-white font-bold rounded text-sm"
                    >
                      👍 GOOD
                    </button>
                    <button
                      onClick={() => setFeedbackGiven({ ...feedbackGiven, [selectedImage.id]: 'reporting' })}
                      className="px-4 py-2 border-2 border-red-400 text-red-500 hover:bg-red-400 hover:text-white font-bold rounded text-sm"
                    >
                      👎 ISSUE
                    </button>
                  </div>
                </div>
              ) : feedbackGiven[selectedImage.id] === 'reporting' ? (
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-2">What's wrong with this image?</p>
                  <div className="flex flex-wrap justify-center gap-1">
                    {[
                      { label: 'Cut off', value: 'cropped' },
                      { label: 'Duplicate', value: 'duplicate' },
                      { label: 'Blurry', value: 'blurry' },
                      { label: 'Wrong subject', value: 'wrong_subject' },
                      { label: 'Background', value: 'background' },
                      { label: 'Missing prop', value: 'missing_prop' },
                      { label: 'Other', value: 'other' }
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          const feedback = {
                            imageId: selectedImage.id,
                            prompt: selectedImage.prompt,
                            style: selectedImage.style,
                            rating: 'bad',
                            issue: option.value,
                            timestamp: new Date().toISOString()
                          };
                          const existing = JSON.parse(localStorage.getItem('ie_feedback') || '[]');
                          localStorage.setItem('ie_feedback', JSON.stringify([...existing, feedback]));
                          setFeedbackGiven({ ...feedbackGiven, [selectedImage.id]: 'reported' });
                        }}
                        className="px-2 py-1 text-xs border-2 border-gray-400 hover:border-black hover:bg-black hover:text-white rounded"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center text-green-600 font-bold text-sm">
                  ✓ Thanks!
                </div>
              )}
            </div>
            
            <div className="border-t-2 border-black p-3 flex gap-2">
              <button
                onClick={async () => {
                  try {
                    const response = await fetch(selectedImage.url);
                    const blob = await response.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `entourage-${selectedImage.id}.png`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  } catch (err) {
                    window.open(selectedImage.url, '_blank');
                  }
                }}
                className="flex-1 text-center text-base font-bold py-2 border-2 border-black hover:bg-black hover:text-white"
              >
                DOWNLOAD ↓
              </button>
              <button
                onClick={() => {
                  const updatedGallery = gallery.filter(img => img.id !== selectedImage.id);
                  setGallery(updatedGallery);
                  localStorage.setItem('ie_gallery', JSON.stringify(updatedGallery));
                  setSelectedImage(null);
                }}
                className="px-3 py-2 border-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-white font-bold text-sm"
              >
                🗑
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="border-t-4 border-black p-4 md:p-6 mt-8 md:mt-16">
        <div className="max-w-4xl mx-auto text-center font-bold text-sm md:text-base">
          INFINITE ENTOURAGE • PEOPLE • ANIMALS • VEHICLES • PLANTS • OBJECTS
        </div>
      </footer>
    </div>
  );
}
