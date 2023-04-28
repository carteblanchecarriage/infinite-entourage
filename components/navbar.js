import Link from 'next/link';
export default function Navbar() {
  return (
    <>
      <div className='mx-auto max-w-4xl flex justify-between items-center text-2xl font-semibold italic m-6'>
        <Link href='/'>INFINITE ENTOURAGE</Link>
        <Link href='/login' className='text-right text-sm italic'>
          LOGIN
        </Link>
      </div>
    </>
  );
}
