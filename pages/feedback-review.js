import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function FeedbackReview() {
  const [feedback, setFeedback] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const stored = localStorage.getItem('ie_feedback');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setFeedback(data.reverse()); // Newest first
      } catch (e) {
        console.error('Failed to load feedback:', e);
      }
    }
  }, []);

  const filteredFeedback = filter === 'all' 
    ? feedback 
    : feedback.filter(f => f.rating === filter || f.issue === filter);

  const stats = {
    total: feedback.length,
    good: feedback.filter(f => f.rating === 'good').length,
    bad: feedback.filter(f => f.rating === 'bad').length,
    issues: {}
  };

  feedback.forEach(f => {
    if (f.issue) {
      stats.issues[f.issue] = (stats.issues[f.issue] || 0) + 1;
    }
  });

  const issueLabels = {
    cropped: 'Cut off / cropped',
    duplicate: 'Duplicate objects',
    blurry: 'Blurry / unclear',
    wrong_subject: 'Wrong subject',
    background: 'Background not removed',
    missing_prop: 'Missing item/prop',
    other: 'Other'
  };

  const exportData = () => {
    const dataStr = JSON.stringify(feedback, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `feedback-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-white text-black font-mono p-6">
      <header className="border-b-4 border-black p-6 mb-8">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Link href="/" className="text-3xl font-black tracking-tighter hover:bg-black hover:text-white px-2">
            INFINITE ENTOURAGE
          </Link>
          <div className="text-sm text-gray-600">
            Feedback Review (Local Data)
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-black mb-6">FEEDBACK REVIEW</h1>

        {/* STATS */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="border-4 border-black p-4">
            <div className="text-3xl font-black">{stats.total}</div>
            <div className="text-sm">Total Reviews</div>
          </div>
          <div className="border-4 border-green-500 p-4">
            <div className="text-3xl font-black text-green-600">{stats.good}</div>
            <div className="text-sm">Good 👍</div>
          </div>
          <div className="border-4 border-red-400 p-4">
            <div className="text-3xl font-black text-red-500">{stats.bad}</div>
            <div className="text-sm">Issues 👎</div>
          </div>
        </div>

        {/* ISSUE BREAKDOWN */}
        {stats.bad > 0 && (
          <div className="border-4 border-black p-4 mb-8">
            <h2 className="text-xl font-bold mb-4">ISSUE BREAKDOWN</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.entries(stats.issues).map(([issue, count]) => (
                <button
                  key={issue}
                  onClick={() => setFilter(filter === issue ? 'all' : issue)}
                  className={`p-2 border-2 text-left ${filter === issue ? 'bg-black text-white' : 'border-gray-300 hover:border-black'}`}
                >
                  <div className="font-bold">{count}</div>
                  <div className="text-xs">{issueLabels[issue] || issue}</div>
                </button>
              ))}
            </div>          
          </div>
        )}

        {/* FILTER CONTROLS */}
        <div className="flex gap-2 mb-6">
          {['all', 'good', 'bad'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 border-2 font-bold ${
                filter === f 
                  ? 'bg-black text-white border-black' 
                  : 'border-gray-300 hover:border-black'
              }`}
            >
              {f === 'all' ? 'ALL' : f === 'good' ? '👍 GOOD' : '👎 ISSUES'}
            </button>
          ))}
          <button
            onClick={exportData}
            className="ml-auto px-4 py-2 border-2 border-blue-500 text-blue-600 hover:bg-blue-500 hover:text-white font-bold"
          >
            EXPORT JSON
          </button>
        </div>

        {/* FEEDBACK LIST */}
        <div className="space-y-4">
          {filteredFeedback.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No feedback data yet.</p>
          ) : (
            filteredFeedback.map((item) => (
              <div key={item.imageId} className="border-2 border-black p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-sm font-bold ${
                      item.rating === 'good' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {item.rating === 'good' ? '👍 GOOD' : '👎 ISSUE'}
                    </span>
                    {item.issue && (
                      <span className="px-2 py-1 text-sm bg-gray-100">
                        {issueLabels[item.issue] || item.issue}
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-gray-500">
                    {new Date(item.timestamp).toLocaleString()}
                  </span>
                </div>
                
                <p className="font-bold mb-1">{item.prompt}</p>
                <p className="text-sm text-gray-600">Style: {item.style}</p>
              </div>
            ))
          )}
        </div>

        {/* HOW TO USE */}
        <div className="mt-12 border-4 border-gray-300 p-4 text-sm text-gray-600">
          <p className="font-bold mb-2">HOW TO USE THIS DATA:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Look for patterns in the "Issue Breakdown" section</li>
            <li>Click an issue type to filter and see all related prompts</li>
            <li>Export JSON to analyze trends over time</li>
            <li>Update promptBuilder.js to fix common issues</li>
          </ul>
          <p className="mt-4 font-bold">
            Access this page anytime: /feedback-review
          </p>
        </div>
      </main>
    </div>
  );
}
