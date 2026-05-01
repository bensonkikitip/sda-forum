import { ImageResponse } from 'next/og'

export const size = {
  width: 512,
  height: 512,
}

export const contentType = 'image/png'

/**
 * SDA app icon: navy background with a white cross.
 * Rendered at build time by Next 16's ImageResponse.
 */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#1e3a8a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 96,
        }}
      >
        {/* Cross composed from two white rectangles */}
        <div
          style={{
            position: 'relative',
            width: 280,
            height: 360,
            display: 'flex',
          }}
        >
          {/* Vertical stroke */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 110,
              width: 60,
              height: 360,
              background: '#ffffff',
              borderRadius: 12,
            }}
          />
          {/* Horizontal stroke */}
          <div
            style={{
              position: 'absolute',
              top: 110,
              left: 0,
              width: 280,
              height: 60,
              background: '#ffffff',
              borderRadius: 12,
            }}
          />
        </div>
      </div>
    ),
    { ...size }
  )
}
