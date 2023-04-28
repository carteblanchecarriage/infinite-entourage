import { useState, useEffect } from 'react';
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react';

export default function Account({ session }) {
  const supabase = useSupabaseClient();
  const user = useUser();
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState(null);
  const [website, setWebsite] = useState(null);
  const [avatar_url, setAvatarUrl] = useState(null);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    getProfile();
    console.log(session.user);
  }, [session]);

  async function getProfile() {
    try {
      setLoading(true);

      let { data, error, status } = await supabase
        .from('profiles')
        .select(`username, avatar_url`)
        .eq('id', user.id)
        .single();

      if (error && status !== 406) {
        throw error;
      }

      if (data) {
        setUsername(data.username);
        setWebsite(data.website);
        setAvatarUrl(data.avatar_url);
      }
    } catch (error) {
      alert('Error loading user data!');
      console.log(error);
    } finally {
      setLoading(false);
    }
  }

  async function updateProfile({ username, website, avatar_url }) {
    try {
      setLoading(true);

      const updates = {
        id: user.id,
        username,
        website,
        avatar_url,
        updated_at: new Date().toISOString(),
      };

      let { error } = await supabase.from('profiles').upsert(updates);
      if (error) throw error;
      setEditMode(false);
      alert('Profile updated!');
    } catch (error) {
      alert('Error updating the data!');
      console.log(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className='font-bold text-2xl'>YOUR PROFILE</div>
      <p onClick={() => setEditMode(true)}>edit</p>
      <div className='max-w-lg w-full flex flex-col items-center justify-center mt-6'>
        <div className='bg-transparent w-full text-center flex flex-col'>
          <label htmlFor='email' className='font-bold'>
            Email:
          </label>
          <input
            id='email'
            type='text'
            value={session.user.email}
            disabled
            className='w-full bg-transparent text-center'
          />
        </div>

        <div className='bg-transparent w-full text-center flex flex-col mt-4'>
          <label htmlFor='email' className='font-bold'>
            Username:
          </label>
          <input
            id='email'
            type='text'
            value={username || ''}
            onChange={(e) => setUsername(e.target.value)}
            disabled={!editMode}
            className='w-full bg-gray-700 text-center'
          />
        </div>

        <div>
          <button
            className='button block border border-white p-2 w-[100px] mt-12 mb-4'
            onClick={() => updateProfile({ username, website, avatar_url })}
            /* disabled={loading} */
          >
            {loading ? 'Loading ...' : 'Update'}
          </button>
        </div>
        <div>
          <button
            className='button block border border-white p-2 w-[100px]'
            onClick={() => supabase.auth.signOut()}
          >
            Sign Out
          </button>
          {/*           <button
            className='button block border border-red-600 text-red-600 p-2 w-[100px] mt-4'
            onClick={handleDelete}
          >
            Delete Account
          </button> */}
        </div>
      </div>
    </>
  );
}
