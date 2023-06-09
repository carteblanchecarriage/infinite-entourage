import Image from 'next/image';
import { Inter } from 'next/font/google';
import { useState } from 'react';
import { Test } from '@/utils/testImage';
import { useEffect } from 'react';
import Link from 'next/link';

const inter = Inter({ subsets: ['latin'] });

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [entourageResult, setEntourageResult] = useState('');
  const [imageProcessing, setImageProcessing] = useState(false);
  const [styleState, setStyleState] = useState('');
  const [error, setError] = useState('');

  async function fetchData() {
    if (prompt.length < 5) {
      setError('Please enter a longer prompt');
      console.log('error');
    } else {
      setEntourageResult('');
      setImageProcessing(true);
      const requestOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prompt),
      };
      const res = await fetch('/api/getEntourage', requestOptions);
      const data = await res.json();
      setEntourageResult(data);
      if (data) {
        setImageProcessing(false);
        setError('');
      }
    }
  }

  function handleStyle(e) {
    console.log('just a log', e.target.id);
    setStyleState(e.target.id);
  }

  function handlePromptChange(e) {
    setPrompt(e.target.value);
  }

  useEffect(() => {
    setEntourageResult('');
    console.log('actualy state', styleState);
  }, [styleState]);

  const styles = ['realistic', 'illustration', 'silhouette'];

  return (
    <>
      <main
        className={`flex min-h-screen flex-col items-center mt-16 ${inter.className}`}
      >
        <div className='w-full max-w-lg relative flex flex-col place-items-center '>
          <div className='text-gray-200'>
            Entourage: The people, plants, and objects in an architectural
            image, typically done in photoshop. For this reason images with
            transparent backgrounds are needed and it can be time consuming to
            find the right image with all the right properties to fit a
            rendering.
          </div>
          <div className='text-gray-200 mt-2'>
            This site is currently fake. To test the concept, select realistic
            and enter the following prompt and click &apos;Create
            Entourage&apos;{' '}
            <code className='block bg-gray-800 text-white px-2 mt-2'>
              Old man wearing a sweater, standing, facing forward with his hands
              crossed behind his back
            </code>
          </div>
          <textarea
            className='w-full mt-4 text-black p-2 z-10'
            value={prompt}
            placeholder='enter your prompt here'
            onChange={handlePromptChange}
          ></textarea>
          <div className='flex justify-between w-full mt-2'>
            {styles.map((style) => (
              <>
                <div key={style}>
                  <button
                    className={`${
                      style == styleState ? 'bg-blue-500' : 'bg-white'
                    } p-2  text-black cursor-pointer rounded-md mt-4`}
                    onClick={(e) => handleStyle(e)}
                    id={style}
                  >
                    {style}
                  </button>
                </div>
              </>
            ))}
          </div>

          <button
            className='mt-12 bg-transparent hover:bg-blue-500 text-blue-700 font-semibold hover:text-white py-2 px-4 border border-blue-500 hover:border-transparent rounded'
            onClick={fetchData}
          >
            {entourageResult ? 'Recreate' : ' Create Entourage'}
          </button>
        </div>
        <div className='flex flex-col'>
          {error && !imageProcessing ? (
            <p>{error}</p>
          ) : imageProcessing ? (
            <Image
              src='/loading_spinner.gif'
              alt='spinner'
              width={100}
              height={100}
              className='mt-6'
            />
          ) : entourageResult ? (
            <Image
              src={entourageResult}
              alt='entourage'
              width={100}
              height={100}
              className='mt-6'
            />
          ) : null}
        </div>
      </main>
    </>
  );
}
