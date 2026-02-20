import Link from 'next/link';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-white text-black font-mono">
      {children}
    </div>
  );
}
