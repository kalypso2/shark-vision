'use client'

import { useRef, useState, useEffect } from 'react'

export default function WebcamCapture() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)

  const startWebcam = async () => {
    try {
      setError(null)
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        setStream(mediaStream)
        setIsStreaming(true)
      }
    } catch (err) {
      console.error('Error accessing webcam:', err)
      setError('Failed to access webcam. Please ensure you have granted camera permissions.')
    }
  }

  const stopWebcam = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
      setIsStreaming(false)
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
    }
  }

  const captureSnapshot = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas')
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
      const ctx = canvas.getContext('2d')
      
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0)
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `snapshot-${Date.now()}.png`
            a.click()
            URL.revokeObjectURL(url)
          }
        })
      }
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [stream])

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '1.5rem',
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      padding: '2rem',
      borderRadius: '1rem',
      backdropFilter: 'blur(10px)',
      boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
      border: '1px solid rgba(255, 255, 255, 0.18)',
      maxWidth: '900px',
      width: '100%',
    }}>
      <div style={{
        position: 'relative',
        width: '100%',
        backgroundColor: '#000',
        borderRadius: '0.5rem',
        overflow: 'hidden',
        minHeight: '400px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {!isStreaming && !error && (
          <div style={{
            position: 'absolute',
            textAlign: 'center',
            color: '#888',
          }}>
            <svg
              style={{ width: '64px', height: '64px', marginBottom: '1rem' }}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
            </svg>
            <p>Click &ldquo;Start Webcam&rdquo; to begin</p>
          </div>
        )}
        {error && (
          <div style={{
            position: 'absolute',
            textAlign: 'center',
            color: '#ff6b6b',
            padding: '1rem',
          }}>
            <p>{error}</p>
          </div>
        )}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%',
            height: 'auto',
            display: isStreaming ? 'block' : 'none',
          }}
        />
      </div>

      <div style={{
        display: 'flex',
        gap: '1rem',
        flexWrap: 'wrap',
        justifyContent: 'center',
      }}>
        {!isStreaming ? (
          <button
            onClick={startWebcam}
            style={{
              padding: '0.75rem 2rem',
              fontSize: '1rem',
              fontWeight: '600',
              color: '#fff',
              backgroundColor: '#667eea',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 15px 0 rgba(102, 126, 234, 0.4)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#5568d3'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#667eea'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            Start Webcam
          </button>
        ) : (
          <>
            <button
              onClick={stopWebcam}
              style={{
                padding: '0.75rem 2rem',
                fontSize: '1rem',
                fontWeight: '600',
                color: '#fff',
                backgroundColor: '#ff6b6b',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 15px 0 rgba(255, 107, 107, 0.4)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#ee5a5a'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ff6b6b'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              Stop Webcam
            </button>
            <button
              onClick={captureSnapshot}
              style={{
                padding: '0.75rem 2rem',
                fontSize: '1rem',
                fontWeight: '600',
                color: '#fff',
                backgroundColor: '#51cf66',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 15px 0 rgba(81, 207, 102, 0.4)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#40c057'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#51cf66'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              Capture Snapshot
            </button>
          </>
        )}
      </div>
    </div>
  )
}

