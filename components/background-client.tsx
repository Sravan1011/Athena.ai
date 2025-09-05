"use client";

import dynamic from 'next/dynamic';
import { Background } from './background';

interface BackgroundClientProps {
  src: string;
  placeholder: string;
}

export function BackgroundClient({ src, placeholder }: BackgroundClientProps) {
  return <Background src={src} placeholder={placeholder} />;
}

export default dynamic(() => Promise.resolve(BackgroundClient), {
  ssr: false,
});
