import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SDA Community',
    short_name: 'SDA',
    description:
      'Stay connected with announcements and events from your church and region.',
    start_url: '/home',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#1e3a8a',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}
