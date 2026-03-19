import Link from 'next/link';
import { useSession } from '@supabase/auth-helpers-react';

export default function Navbar() {
  const session = useSession();

  return (
    <div className="mx-auto max-w-4xl flex justify-between items-center text-2xl font-semibold italic m-6">
      <Link href="/">INFINITE ENTOURAGE</Link>
      <Link href={session ? '/account' : '/login'} className="text-right text-sm italic">
        {session ? 'ACCOUNT' : 'LOGIN'}
      </Link>
    </div>
  );
}
