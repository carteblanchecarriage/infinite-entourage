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
        <h1>LOGIN</h1>
        {!session ? (
          <Auth
            supabaseClient={supabase}
            appearance={{ theme: ThemeSupa }}
            theme='dark'
          />
        ) : (
          <>
            <Account session={session} />
            <p>youre logged in</p>
          </>
        )}
      </div>
    </>
  );
}
