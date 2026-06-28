import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

// iOS "Add to Home Screen" icon — orange badge with the white cat mark.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f97316',
        }}
      >
        <svg width="120" height="120" viewBox="0 0 24 24">
          <path d="M5 3 L9 8 Q12 7 15 8 L19 3 V10 A7 7 0 1 1 5 10 Z" fill="#ffffff" />
          <circle cx="10" cy="11.5" r="1.15" fill="#f97316" />
          <circle cx="14" cy="11.5" r="1.15" fill="#f97316" />
        </svg>
      </div>
    ),
    { ...size }
  )
}
