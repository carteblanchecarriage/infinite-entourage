import Link from 'next/link';

export default function SiteHeader({ children }) {
  return (
    <header className="border-b-4 border-black">
      <div className="max-w-4xl mx-auto px-4 md:px-6 h-16 md:h-20 flex justify-between items-center">
        <Link href="/" className="text-xl md:text-3xl font-black tracking-tighter hover:bg-black hover:text-white px-2 py-1 shrink-0">
          INFINITE ENTOURAGE
        </Link>
        {children && (
          <div className="flex items-center gap-2 md:gap-3">
            {children}
          </div>
        )}
      </div>
    </header>
  );
}
