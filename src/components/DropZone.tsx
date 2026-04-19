import type { RefObject } from 'react'

interface Props {
  fullscreen?: boolean
  isDragging: boolean
  inputRef: RefObject<HTMLInputElement | null>
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onBrowseClick: () => void
}

export default function DropZone({ fullscreen, isDragging, inputRef, onInputChange, onBrowseClick }: Props) {
  return (
    <div style={{
      position: fullscreen ? 'fixed' : 'relative',
      inset: fullscreen ? 0 : undefined,
      zIndex: fullscreen ? 1000 : undefined,
      display: 'grid',
      placeItems: 'center',
      background: fullscreen ? 'rgba(13, 17, 23, 0.97)' : 'transparent',
      pointerEvents: fullscreen ? 'auto' : undefined,
      width: '100%',
      height: '100%',
    }}>
      <div style={{
        width: 560,
        maxWidth: '90vw',
        padding: 48,
        background: '#0d1117',
        border: `2px dashed ${isDragging ? '#1f6feb' : '#30363d'}`,
        borderRadius: 12,
        textAlign: 'center',
        transition: 'border-color 120ms, transform 120ms',
        transform: isDragging ? 'scale(1.015)' : 'scale(1)',
      }}>
        <div
          className={isDragging ? 'pulse-ring' : ''}
          style={{
            width: 80, height: 80,
            margin: '0 auto 20px',
            borderRadius: '50%',
            background: 'radial-gradient(circle at center, rgba(31,111,235,0.35), transparent 70%)',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#58a6ff" strokeWidth="1.5">
            <path d="M3 16V5a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v8" strokeLinejoin="round" strokeLinecap="round"/>
            <path d="M12 12v8M8 16l4-4 4 4" strokeLinejoin="round" strokeLinecap="round"/>
          </svg>
        </div>

        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 500, letterSpacing: '-0.01em' }}>
          Drop DICOM files or folder
        </h1>
        <p style={{ margin: '8px 0 24px', color: '#8b949e', fontSize: 15 }}>
          PET series — SUV calculated entirely in your browser using{' '}
          <code className="mono" style={{ color: '#c9d1d9' }}>dicom-parser</code>.
        </p>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button
            onClick={onBrowseClick}
            style={{
              padding: '10px 18px', fontSize: 15, fontWeight: 500,
              background: '#1f6feb', color: '#fff',
              border: 'none', borderRadius: 6, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 8,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" strokeLinejoin="round"/>
            </svg>
            Select folder…
          </button>
          <button
            onClick={() => {
              const el = document.getElementById('suv-file-picker') as HTMLInputElement | null
              el?.click()
            }}
            style={{
              padding: '10px 18px', fontSize: 15, fontWeight: 500,
              background: 'transparent', color: '#c9d1d9',
              border: '1px solid #30363d', borderRadius: 6, cursor: 'pointer',
            }}
          >
            Select files…
          </button>
        </div>

        {/* folder picker */}
        <input
          ref={inputRef}
          type="file"
          {...({ webkitdirectory: '', directory: '' } as Record<string, string>)}
          multiple
          style={{ display: 'none' }}
          onChange={onInputChange}
        />
        {/* individual files picker */}
        <input
          id="suv-file-picker"
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={onInputChange}
        />

        <div className="mono" style={{
          marginTop: 28, padding: '10px 14px',
          background: '#0b3d20', border: '1px solid #238636',
          borderRadius: 6, color: '#7ee787',
          fontSize: 13, letterSpacing: '0.02em',
        }}>
          100% CLIENT-SIDE &nbsp;·&nbsp; FILES NEVER LEAVE YOUR BROWSER
        </div>
      </div>
    </div>
  )
}
