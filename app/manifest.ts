import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'StreetCats — Help Street Cats Find a Home',
    short_name: 'StreetCats',
    description: 'Spot a street cat, share its location, and help it get adopted.',
    start_url: '/',
    display: 'standalone',
    background_color: '#fff7ed',
    theme_color: '#f97316',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
  }
}
