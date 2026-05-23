import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'snapfolio — a travel photo wall',
  description:
    'Masonry travel gallery with blur-up loading, a map of photo locations, and direct-to-Cloudinary uploads with EXIF GPS extraction.',
  metadataBase: new URL('https://snapfolio.vercel.app'), // update to real URL after deploy
  openGraph: {
    title: 'snapfolio — a travel photo wall',
    description: 'Masonry gallery, blur-up loading, EXIF-mapped photo locations.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>{children}</body>
    </html>
  );
}
