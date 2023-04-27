import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import Account from '@/components/Account';

export default function Login() {
  const session = useSession();
  const supabase = useSupabaseClient();

  return (
    <>
      <div className='w-full p-8 flex flex-col items-center'>
        {!session ? (
          <>
            <h1 className='text-2xl font-semibold'>LOGIN / SIGN-UP</h1>
            <Auth
              supabaseClient={supabase}
              appearance={{ theme: ThemeSupa }}
              providers={[]}
              theme='dark'
            />
          </>
        ) : (
          <>
            <Account session={session} />
          </>
        )}
      </div>
    </>
  );
}
