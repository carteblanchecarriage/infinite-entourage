import Image from 'next/image';
import { useState } from 'react';
import Link from 'next/link';

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState('');
  const [processing, setProcessing] = useState(false);
  const [style, setStyle] = useState('realistic');
  const [error, setError] = useState('');

  const styles = [
    { id: 'realistic', label: 'REALISTIC' },
    { id: 'illustration', label: 'ILLUSTRATION' },
    { id: 'silhouette', label: 'SILHOUETTE' },
  ];

  async function generate() {
    if (prompt.length < 3) {
      setError('ENTER A PROMPT');
      return;
    }
    setResult('');
    setProcessing(true);
    setError('');
    
    try {
      const res = await fetch('/api/getEntourage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, style }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Generation failed');
      }
      
      const data = await res.json();
      setResult(data.url);
    } catch (e) {
      setError(e.message || 'ERROR');
    }
    setProcessing(false);
  }

  return (
    <div className="min-h-screen bg-white text-black font-mono">
      {/* HEADER */}
      <header className="border-b-4 border-black p-4 md:p-6">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <Link href="/" className="text-2xl md:text-4xl font-black tracking-tighter hover:bg-black hover:text-white px-2">
            INFINITE ENTOURAGE
          </Link>
          <div className="flex gap-4">
            <Link href="/credits" className="text-base md:text-xl font-bold border-2 border-black px-3 md:px-4 py-2 hover:bg-black hover:text-white transition">
              CREDITS
            </Link>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="max-w-4xl mx-auto p-4 md:p-6">
        
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
          disabled={processing}
          className="w-full text-xl md:text-3xl font-black py-4 md:py-6 border-4 border-black bg-black text-white hover:bg-white hover:text-black transition disabled:opacity-50"
        >
          {processing ? 'GENERATING...' : result ? 'GENERATE AGAIN' : 'GENERATE'}
        </button>

        {error && (
          <div className="mt-4 p-3 md:p-4 border-4 border-black bg-red-500 text-white font-bold text-base md:text-xl">
            {error}
          </div>
        )}

        {/* RESULT */}
        {processing && (
          <div className="mt-8 md:mt-12 flex justify-center">
            <div className="text-xl md:text-2xl font-bold animate-pulse">LOADING...</div>
          </div>
        )}

        {result && !processing && (
          <div className="mt-8 md:mt-12 border-4 border-black p-3 md:p-4">
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
                      // Fallback: open in new tab
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
            <div className="flex justify-center bg-[url('/checkerboard.png')] bg-contain">
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

        {/* EXAMPLES */}
        <div className="mt-16 border-t-4 border-black pt-8">
          <h2 className="text-2xl md:text-3xl font-black mb-6">EXAMPLE PROMPTS</h2>
          <ul className="space-y-2 text-base md:text-xl font-bold">
            <li 
              className="cursor-pointer hover:bg-black hover:text-white p-2"
              onClick={() => setPrompt('walking person')}
            >
              → WALKING PERSON
            </li>
            <li 
              className="cursor-pointer hover:bg-black hover:text-white p-2"
              onClick={() => setPrompt('golden retriever sitting')}
            >
              → GOLDEN RETRIEVER SITTING
            </li>
            <li 
              className="cursor-pointer hover:bg-black hover:text-white p-2"
              onClick={() => setPrompt('red car parked')}
            >
              → RED CAR PARKED
            </li>
            <li 
              className="cursor-pointer hover:bg-black hover:text-white p-2"
              onClick={() => setPrompt('oak tree')}
            >
              → OAK TREE
            </li>
            <li 
              className="cursor-pointer hover:bg-black hover:text-white p-2"
              onClick={() => setPrompt('park bench')}
            >
              → PARK BENCH
            </li>
            <li 
              className="cursor-pointer hover:bg-black hover:text-white p-2"
              onClick={() => setPrompt('bicycle leaning against wall')}
            >
              → BICYCLE LEANING AGAINST WALL
            </li>
          </ul>
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
