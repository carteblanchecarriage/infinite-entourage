import Image from 'next/image';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from '@supabase/auth-helpers-react';
import SiteHeader from '../components/SiteHeader';

export default function Home() {
  const session = useSession();
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState('');
  const [processing, setProcessing] = useState(false);
  const [style, setStyle] = useState('realistic');
  const [error, setError] = useState('');
  const [credits, setCredits] = useState(0);
  const [freeUsed, setFreeUsed] = useState(0);
  const [anonUsed, setAnonUsed] = useState(0);
  const [showCreditPrompt, setShowCreditPrompt] = useState(false);
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);
  const [infiniteMode, setInfiniteMode] = useState(false);
  const [gallery, setGallery] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [feedbackGiven, setFeedbackGiven] = useState({});

  const styles = [
    { id: 'realistic', label: 'REALISTIC' },
    { id: 'illustration', label: 'ILLUSTRATION' },
    { id: 'silhouette', label: 'SILHOUETTE' },
  ];

  // Load gallery, feedback, and anon usage from localStorage on mount
  useEffect(() => {
    const storedGallery = localStorage.getItem('ie_gallery');
    if (storedGallery) {
      try { setGallery(JSON.parse(storedGallery)); } catch (e) {}
    }
    const storedFeedback = localStorage.getItem('ie_feedback');
    if (storedFeedback) {
      try {
        const feedbackList = JSON.parse(storedFeedback);
        const feedbackMap = {};
        feedbackList.forEach(f => {
          feedbackMap[f.imageId] = f.rating === 'bad' ? 'reported' : 'good';
        });
        setFeedbackGiven(feedbackMap);
      } catch (e) {}
    }
    const storedInfinite = localStorage.getItem('ie_infinite_mode');
    if (storedInfinite === 'true') setInfiniteMode(true);
    const storedAnonUsed = localStorage.getItem('ie_anon_used');
    if (storedAnonUsed) setAnonUsed(parseInt(storedAnonUsed, 10) || 0);
  }, []);

  // Fetch credits from server when session is available
  useEffect(() => {
    if (session) fetchCredits();
  }, [session]);

  const fetchCredits = async () => {
    try {
      const res = await fetch('/api/get-credits', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCredits(data.credits || 0);
      }
    } catch (err) {
      console.error('Failed to fetch credits:', err);
    }
  };

  const handlePromptChange = (e) => {
    const value = e.target.value;
    setPrompt(value);
    if (value.toLowerCase().trim() === 'infinite') {
      if (!infiniteMode) {
        setInfiniteMode(true);
        localStorage.setItem('ie_infinite_mode', 'true');
        setError('🔓 INFINITE MODE ACTIVATED - Unlimited generations!');
        setTimeout(() => setError(''), 3000);
      } else {
        setInfiniteMode(false);
        localStorage.removeItem('ie_infinite_mode');
        setPrompt('');
        setError('🔒 Infinite mode deactivated.');
        setTimeout(() => setError(''), 3000);
      }
    }
  };

  async function generate() {
    if (prompt.length < 3) {
      setError('ENTER A PROMPT');
      return;
    }

    if (!infiniteMode && session && credits < 1) {
      setShowCreditPrompt(true);
      return;
    }

    if (!session && !infiniteMode && anonUsed >= 3) {
      setShowSignupPrompt(true);
      return;
    }

    setResult('');
    setProcessing(true);
    setError('');
    setShowCreditPrompt(false);
    setShowSignupPrompt(false);

    const headers = { 'Content-Type': 'application/json' };
    if (session) headers['Authorization'] = `Bearer ${session.access_token}`;

    try {
      const res = await fetch('/api/getEntourage', {
        method: 'POST',
        headers,
        body: JSON.stringify({ prompt, style, infiniteMode }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === 'NO_CREDITS') {
          if (data.requiresSignup) {
            setShowSignupPrompt(true);
          } else {
            setShowCreditPrompt(true);
          }
          throw new Error('No credits remaining');
        }
        throw new Error(data.error || 'Something went wrong. Try again?');
      }

      setResult(data.url);

      // Add to gallery
      const newImage = {
        id: Date.now(),
        url: data.url,
        prompt,
        style,
        timestamp: new Date().toISOString(),
      };
      const updatedGallery = [newImage, ...gallery].slice(0, 20);
      setGallery(updatedGallery);
      localStorage.setItem('ie_gallery', JSON.stringify(updatedGallery));

      // Update local credit counts
      if (!infiniteMode) {
        if (data.isAnon) {
          const newAnonUsed = anonUsed + 1;
          setAnonUsed(newAnonUsed);
          localStorage.setItem('ie_anon_used', String(newAnonUsed));
        } else if (!data.isAdmin) {
          setCredits(data.remainingCredits ?? credits - 1);
        }
      }
    } catch (e) {
      setError(e.message || 'Oops! Something went wrong.');
    }
    setProcessing(false);
  }

  const freeRemaining = Math.max(0, 3 - anonUsed);
  const totalCredits = session ? credits : freeRemaining;

  return (
    <div className="min-h-screen bg-white text-black font-mono">
      <SiteHeader>
        {session ? (
          <>
            <div className={`flex items-center gap-2 border-2 border-black px-2 md:px-3 py-1 md:py-2 ${infiniteMode ? 'bg-purple-100 border-purple-500' : ''}`}>
              <span className="text-sm md:text-base font-bold">{infiniteMode ? '∞' : credits}</span>
              <span className="text-xs md:text-sm text-gray-600">{infiniteMode ? 'INFINITE' : 'CREDITS'}</span>
            </div>
            <Link href="/credits" className="text-sm md:text-base font-bold border-2 border-black px-2 md:px-3 py-1 md:py-2 hover:bg-black hover:text-white transition">
              BUY
            </Link>
            <Link href="/account" className="text-sm font-bold border-2 border-black px-2 md:px-3 py-1 md:py-2 hover:bg-black hover:text-white transition">
              ACCOUNT
            </Link>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 border-2 border-black px-2 md:px-3 py-1 md:py-2">
              <span className="text-sm md:text-base font-bold">{freeRemaining}</span>
              <span className="text-xs md:text-sm text-gray-600">FREE LEFT</span>
            </div>
            <Link href="/login" className="text-sm md:text-base font-bold border-2 border-black px-2 md:px-3 py-1 md:py-2 hover:bg-black hover:text-white transition">
              SIGN IN
            </Link>
          </>
        )}
      </SiteHeader>

      <main className="max-w-4xl mx-auto p-4 md:p-6">

        {/* SIGNUP PROMPT (anonymous free exhausted) */}
        {showSignupPrompt && (
          <div className="mb-8 border-4 border-black bg-black text-white p-6">
            <h2 className="text-2xl font-black mb-2">LIKE WHAT YOU SEE?</h2>
            <p className="text-lg mb-6">Sign up to keep going. Credits start at $5 for 20 generations — no subscription, no commitment.</p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/login" className="text-center text-xl font-black py-4 px-8 border-4 border-white bg-white text-black hover:bg-black hover:text-white hover:border-white transition">
                SIGN UP →
              </Link>
              <button onClick={() => setShowSignupPrompt(false)} className="text-center text-xl font-bold py-4 px-8 border-4 border-white hover:bg-white hover:text-black transition">
                MAYBE LATER
              </button>
            </div>
          </div>
        )}

        {/* CREDIT PROMPT (logged in, out of credits) */}
        {showCreditPrompt && (
          <div className="mb-8 border-4 border-yellow-500 bg-yellow-50 p-6">
            <h2 className="text-2xl font-black mb-4">YOU'VE USED ALL YOUR CREDITS!</h2>
            <p className="text-lg mb-4">Ready to create more?</p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/credits" className="text-center text-xl font-black py-4 border-4 border-black bg-black text-white hover:bg-white hover:text-black transition">
                BUY CREDITS →
              </Link>
              <button onClick={() => setShowCreditPrompt(false)} className="text-center text-xl font-bold py-4 border-4 border-black hover:bg-black hover:text-white transition">
                MAYBE LATER
              </button>
            </div>
          </div>
        )}

        {/* HERO */}
        <div className="mb-8 border-4 border-black p-6 md:p-10">
          <div className="flex flex-col md:flex-row gap-8 items-center">
            <div className="flex-1">
              <h1 className="text-4xl md:text-6xl font-black mb-4 leading-none">
                DRAG AND DROP<br />INTO YOUR<br />RENDER.
              </h1>
              <p className="text-lg md:text-xl font-bold mb-2">
                Describe what you need. Get a transparent PNG, ready to paste.
              </p>
              <p className="text-base text-gray-600">
                No background removal. No stock library.
              </p>
              {!session && freeRemaining > 0 && (
                <p className="mt-4 text-base font-bold text-green-700 border-2 border-green-700 inline-block px-3 py-1">
                  {freeRemaining} FREE GENERATION{freeRemaining !== 1 ? 'S' : ''} REMAINING — NO SIGN UP NEEDED
                </p>
              )}
            </div>
            <div className="w-full md:w-56 flex-shrink-0 text-center">
              <img src="/example-lemon-tree-clay-pot.png" alt="Transparent lemon tree" className="w-full" />
              <p className="text-xs text-gray-500 mt-2">transparent PNG, ready to use</p>
            </div>
          </div>
        </div>

        {/* DIFFERENTIATORS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="border-4 border-black p-5">
            <div className="text-2xl font-black mb-2">TRANSPARENT,<br />ALWAYS.</div>
            <p className="text-sm text-gray-700">Every output is a cutout PNG with no background — ready to drop straight into Photoshop, Lumion, or any render. What you see is what you paste.</p>
          </div>
          <div className="border-4 border-black p-5">
            <div className="text-2xl font-black mb-2">JUST DESCRIBE<br />THE PERSON.</div>
            <p className="text-sm text-gray-700">Say "elderly man sitting" or "young woman with a coffee". We handle the rest — outfit, age, pose, and look. No two generations are the same, so your renders feel lived-in, not cloned.</p>
          </div>
          <div className="border-4 border-black p-5">
            <div className="text-2xl font-black mb-2">BUILT FOR<br />RENDERINGS.</div>
            <p className="text-sm text-gray-700">Other AI tools give you a photo. We give you entourage. Three styles — realistic, illustration, and silhouette — so it matches your presentation, not just your mood board.</p>
          </div>
        </div>

        {/* EXAMPLES */}
        <div className="mb-8 border-4 border-black p-4 md:p-6">
          <h2 className="text-xl md:text-2xl font-black mb-1">TRY AN EXAMPLE</h2>
          <p className="text-sm text-gray-500 mb-4 font-bold">CLICK TO USE</p>
          <ul className="space-y-1 text-base md:text-lg font-bold">
            <li className="cursor-pointer hover:bg-black hover:text-white p-2" onClick={() => setPrompt('rusty vintage pickup truck side view')}>
              → RUSTY VINTAGE PICKUP TRUCK SIDE VIEW
            </li>
            <li className="cursor-pointer hover:bg-black hover:text-white p-2" onClick={() => setPrompt('lemon tree in a clay pot')}>
              → LEMON TREE IN A CLAY POT
            </li>
            <li className="cursor-pointer hover:bg-black hover:text-white p-2" onClick={() => setPrompt('elderly woman sitting on bench reading newspaper')}>
              → ELDERLY WOMAN SITTING ON BENCH READING NEWSPAPER
            </li>
            <li className="cursor-pointer hover:bg-black hover:text-white p-2" onClick={() => setPrompt('cyclist riding a road bike')}>
              → CYCLIST RIDING A ROAD BIKE
            </li>
          </ul>
          <div className="mt-4 pt-4 border-t-2 border-gray-200 space-y-1">
            <p className="text-xs text-gray-500">TIP: DESCRIBE THE SUBJECT AND ACTION. SKIP BACKGROUNDS LIKE "ON STREET" OR "AGAINST WALL" — THEY MAKE CUTOUTS MESSIER.</p>
            <p className="text-xs text-gray-500">TIP: ADD POSE AND VIEW — "WALKING", "SIDE VIEW", "FRONT VIEW" — FOR CLEANER RESULTS.</p>
          </div>
        </div>

        {/* INPUT */}
        <div className="mb-8">
          <label className="block text-xl md:text-2xl font-bold mb-4">WHAT DO YOU NEED?</label>
          <textarea
            value={prompt}
            onChange={handlePromptChange}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); generate(); } }}
            placeholder="person, dog, car, tree, bench, bicycle, etc..."
            className={`w-full text-lg md:text-xl p-4 border-4 border-black font-mono resize-none h-32 focus:outline-none focus:bg-black focus:text-white transition ${infiniteMode ? 'border-purple-500 bg-purple-50' : ''}`}
          />
          {infiniteMode && <p className="text-sm text-purple-600 font-bold mt-2">🔓 INFINITE MODE ACTIVE</p>}
        </div>

        {/* STYLE */}
        <div className="mb-8">
          <label className="block text-lg md:text-xl font-bold mb-4">STYLE</label>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            {styles.map((s) => (
              <button
                key={s.id}
                onClick={() => setStyle(s.id)}
                className={`text-lg md:text-xl font-bold px-4 md:px-6 py-2 md:py-3 border-4 border-black transition ${style === s.id ? 'bg-black text-white' : 'hover:bg-black hover:text-white'}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* GENERATE */}
        {!infiniteMode && !session && freeRemaining < 1 ? (
          <div className="border-4 border-black bg-black text-white p-6 text-center">
            <p className="text-xl md:text-2xl font-black mb-1">YOU'VE USED YOUR 3 FREE GENERATIONS</p>
            <p className="text-base mb-5 text-gray-300">Sign up to keep going. Credits start at $5 for 20 generations.</p>
            <Link href="/login" className="inline-block text-lg md:text-xl font-black py-3 px-8 border-4 border-white bg-white text-black hover:bg-black hover:text-white hover:border-white transition">
              SIGN UP →
            </Link>
          </div>
        ) : !infiniteMode && totalCredits < 1 && session ? (
          <Link href="/credits" className="block w-full text-xl md:text-3xl font-black py-4 md:py-6 border-4 border-black bg-black text-white hover:bg-white hover:text-black transition text-center">
            NO CREDITS — BUY MORE
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

        {/* RESULT */}
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
                        window.open(result, '_blank');
                      }
                    }}
                    className="flex-1 sm:flex-none text-base md:text-xl font-bold border-2 border-black px-3 md:px-4 py-1 hover:bg-black hover:text-white"
                  >
                    DOWNLOAD ↓
                  </button>
                  <button onClick={() => window.open(result, '_blank')} className="flex-1 sm:flex-none text-base md:text-xl font-bold border-2 border-black px-3 md:px-4 py-1 hover:bg-black hover:text-white text-center">
                    OPEN ↗
                  </button>
                </div>
              </div>
              <div className="flex justify-center bg-[url('/checkerboard.png')] bg-contain min-h-[400px]">
                <Image src={result} alt="Generated" width={400} height={500} className="max-w-full h-auto" />
              </div>
            </div>
          )}
        </div>

        {/* GALLERY */}
        {gallery.length > 0 && (
          <div className="mt-12 border-4 border-black p-4 md:p-6">
            <h2 className="text-xl md:text-2xl font-black mb-4">YOUR GENERATIONS ({gallery.length})</h2>
            <p className="text-sm text-gray-600 mb-4">Click a thumbnail to view larger</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {gallery.map((img) => (
                <button key={img.id} onClick={() => setSelectedImage(img)} className="relative aspect-square border-2 border-black hover:border-purple-500 overflow-hidden bg-[url('/checkerboard.png')] bg-contain">
                  <img src={img.url} alt={img.prompt} className="w-full h-full object-contain" />
                  <div className="absolute bottom-0 left-0 right-0 bg-black text-white text-xs p-1 truncate">{img.style}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* IMAGE MODAL */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
          <div className="bg-white max-w-4xl w-full max-h-[90vh] overflow-auto border-4 border-black" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b-2 border-black p-4">
              <div className="flex-1 min-w-0 mr-4">
                <p className="font-bold truncate">{selectedImage.prompt}</p>
                <p className="text-sm text-gray-600">{selectedImage.style} • {new Date(selectedImage.timestamp).toLocaleString()}</p>
              </div>
              <button onClick={() => setSelectedImage(null)} className="text-2xl font-black px-3 py-1 border-2 border-black hover:bg-black hover:text-white">×</button>
            </div>
            <div className="p-4 flex justify-center bg-[url('/checkerboard.png')] bg-contain">
              <img src={selectedImage.url} alt={selectedImage.prompt} className="max-w-full h-auto max-h-[50vh]" />
            </div>
            {/* FEEDBACK */}
            <div className="border-t border-gray-300 p-3 bg-gray-50">
              {!feedbackGiven[selectedImage?.id] ? (
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-2">How did this turn out?</p>
                  <div className="flex justify-center gap-3">
                    <button onClick={() => {
                      const feedback = { imageId: selectedImage.id, prompt: selectedImage.prompt, style: selectedImage.style, rating: 'good', timestamp: new Date().toISOString() };
                      const existing = JSON.parse(localStorage.getItem('ie_feedback') || '[]');
                      localStorage.setItem('ie_feedback', JSON.stringify([...existing, feedback]));
                      setFeedbackGiven({ ...feedbackGiven, [selectedImage.id]: 'good' });
                    }} className="px-4 py-2 border-2 border-green-500 text-green-600 hover:bg-green-500 hover:text-white font-bold rounded text-sm">
                      👍 GOOD
                    </button>
                    <button onClick={() => setFeedbackGiven({ ...feedbackGiven, [selectedImage.id]: 'reporting' })} className="px-4 py-2 border-2 border-red-400 text-red-500 hover:bg-red-400 hover:text-white font-bold rounded text-sm">
                      👎 ISSUE
                    </button>
                  </div>
                </div>
              ) : feedbackGiven[selectedImage.id] === 'reporting' ? (
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-2">What's wrong with this image?</p>
                  <div className="flex flex-wrap justify-center gap-1">
                    {[
                      { label: 'Cut off', value: 'cropped' }, { label: 'Duplicate', value: 'duplicate' },
                      { label: 'Blurry', value: 'blurry' }, { label: 'Wrong subject', value: 'wrong_subject' },
                      { label: 'Background', value: 'background' }, { label: 'Missing prop', value: 'missing_prop' },
                      { label: 'Other', value: 'other' },
                    ].map((option) => (
                      <button key={option.value} onClick={() => {
                        const feedback = { imageId: selectedImage.id, prompt: selectedImage.prompt, style: selectedImage.style, rating: 'bad', issue: option.value, timestamp: new Date().toISOString() };
                        const existing = JSON.parse(localStorage.getItem('ie_feedback') || '[]');
                        localStorage.setItem('ie_feedback', JSON.stringify([...existing, feedback]));
                        setFeedbackGiven({ ...feedbackGiven, [selectedImage.id]: 'reported' });
                      }} className="px-2 py-1 text-xs border-2 border-gray-400 hover:border-black hover:bg-black hover:text-white rounded">
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center text-green-600 font-bold text-sm">✓ Thanks!</div>
              )}
            </div>
            <div className="border-t-2 border-black p-3 flex gap-2">
              <button onClick={async () => {
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
                } catch (err) { window.open(selectedImage.url, '_blank'); }
              }} className="flex-1 text-center text-base font-bold py-2 border-2 border-black hover:bg-black hover:text-white">
                DOWNLOAD ↓
              </button>
              <button onClick={() => {
                const updatedGallery = gallery.filter(img => img.id !== selectedImage.id);
                setGallery(updatedGallery);
                localStorage.setItem('ie_gallery', JSON.stringify(updatedGallery));
                setSelectedImage(null);
              }} className="px-3 py-2 border-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-white font-bold text-sm">
                🗑
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="border-t-4 border-black p-4 md:p-6 mt-8 md:mt-16">
        <div className="max-w-4xl mx-auto text-center font-bold text-sm md:text-base">
          INFINITE ENTOURAGE • PEOPLE • ANIMALS • VEHICLES • PLANTS • OBJECTS
        </div>
      </footer>
    </div>
  );
}
