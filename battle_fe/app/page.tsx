'use client';

import dynamic from 'next/dynamic';

const HomeContent = dynamic(() => import('@/components/HomeContent'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center bg-black text-white">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
    </div>
  ),
});

const Providers = dynamic(() => import('@/components/Providers').then(mod => mod.Providers), {
  ssr: false,
});

export default function Home() {
  return (
    <Providers>
      <HomeContent />
    </Providers>
  );
}
