import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Fintrack Personal Finance',
    short_name: 'Fintrack',
    description: 'Your personal finance manager',
    start_url: '/',
    display: 'standalone',
    background_color: '#0d0d1a',
    theme_color: '#8b5cf6',
    icons: [
      {
        src: '/icon.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
