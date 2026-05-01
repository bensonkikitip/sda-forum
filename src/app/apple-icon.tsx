import { ImageResponse } from 'next/og'

export const size = {
  width: 180,
  height: 180,
}

export const contentType = 'image/png'

/**
 * Apple Touch Icon — used by iOS when the user adds the site to their home
 * screen. iOS does not auto-round the icon; we keep it square with padding.
 */
export default function AppleIcon() {
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
        }}
      >
        <div
          style={{
            position: 'relative',
            width: 100,
            height: 130,
            display: 'flex',
          }}
        >
          {/* Vertical stroke */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 40,
              width: 20,
              height: 130,
              background: '#ffffff',
              borderRadius: 4,
            }}
          />
          {/* Horizontal stroke */}
          <div
            style={{
              position: 'absolute',
              top: 40,
              left: 0,
              width: 100,
              height: 20,
              background: '#ffffff',
              borderRadius: 4,
            }}
          />
        </div>
      </div>
    ),
    { ...size }
  )
}
