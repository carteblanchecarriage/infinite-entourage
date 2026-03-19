import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import Link from 'next/link';
import SiteHeader from '../components/SiteHeader';

export default function Login() {
  const session = useSession();
  const supabase = useSupabaseClient();
  const router = useRouter();

  useEffect(() => {
    if (session) router.push('/');
  }, [session]);

  return (
    <div className="min-h-screen bg-white text-black font-mono">
      <SiteHeader />

      <main className="max-w-md mx-auto p-6 mt-8">
        <h1 className="text-3xl font-black mb-2">SIGN IN</h1>
        <p className="text-gray-600 mb-8">Sign in or sign up to start generating. Your credits are saved to your account and work across all devices.</p>
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={[]}
          theme="light"
        />
      </main>
    </div>
  );
}
