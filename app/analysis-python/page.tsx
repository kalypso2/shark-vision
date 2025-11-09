'use client'

/**
 * Python Backend Analysis Page
 * Uses MediaPipe Holistic (543 landmarks) via WebSocket
 */

import { useEffect, useRef, useState } from 'react'
import { AnalysisWebSocketClient, RealtimeUpdate, FinalAnalysis, AnalysisMetrics } from '@/lib/websocket_client'
import { AudioClient } from '@/lib/audio_client'
import { useRouter } from 'next/navigation'

export default function PythonAnalysisPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const router = useRouter()
  
  const [wsClient] = useState(() => new AnalysisWebSocketClient('ws://localhost:8000/ws/analyze'))
  const [audioClient] = useState(() => new AudioClient('http://localhost:8000'))
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Real-time status (not scores)
  const [liveStatus, setLiveStatus] = useState<any>(null)
  const [frameCount, setFrameCount] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [noDetection, setNoDetection] = useState(false)
  const [processingComplete, setProcessingComplete] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)

  // Setup WebSocket callbacks
  useEffect(() => {
    wsClient.onConnect = () => {
      setIsConnected(true)
      setError(null)
      console.log('✅ Connected to Python backend')
    }

    wsClient.onDisconnect = () => {
      setIsConnected(false)
      setIsRecording(false)
      console.log('❌ Disconnected from Python backend')
    }

    wsClient.onUpdate = (data: any) => {
      // Handle progress updates (live metrics disabled)
      if (data.type === 'progress') {
        setFrameCount(data.frame)
        setElapsedTime(data.timestamp)
        setNoDetection(false)
      }
    }

    wsClient.onFinal = (data: FinalAnalysis) => {
      console.log('✅ Analysis complete:', data.session_id)
      console.log('Full analysis data:', data.analysis)
      // Navigate to results page
      setTimeout(() => {
        router.push(`/results-python/${data.session_id}`)
      }, 500)  // Small delay to ensure data is saved
    }

    wsClient.onError = (err: string) => {
      setError(err)
      console.error('WebSocket error:', err)
    }

    wsClient.onNoDetection = () => {
      setNoDetection(true)
    }

    return () => {
      wsClient.disconnect()
    }
  }, [wsClient, router])

  // Start webcam
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
        try {
          await videoRef.current.play()
        } catch (playError) {
          console.warn('Video play was interrupted:', playError)
        }
      }
    } catch (err) {
      setError('Failed to access webcam. Please grant camera permissions.')
      console.error('Webcam error:', err)
    }
  }

  // Stop webcam
  const stopWebcam = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  // Start recording/analysis
  const startRecording = async () => {
    if (!stream || !videoRef.current) {
      setError('Please start webcam first')
      return
    }

    try {
      setError(null)
      setIsRecording(true)
      setFrameCount(0)
      setElapsedTime(0)
      setLiveStatus(null)

      // Connect to backend
      await wsClient.connect()
      
      // Wait for session ID
      const sessionId = wsClient.getCurrentSessionId()
      if (!sessionId) {
        // Wait a bit for session ID to arrive
        await new Promise(resolve => setTimeout(resolve, 500))
      }
      
      // Set video element
      wsClient.setVideoElement(videoRef.current)
      
      // Start streaming frames
      await wsClient.startStreaming(10) // 10 FPS
      
      // Start audio capture (with session ID)
      const finalSessionId = wsClient.getCurrentSessionId()
      if (finalSessionId) {
        try {
          await audioClient.startCapture(finalSessionId)
          console.log('🎤 Audio capture started')
        } catch (audioErr) {
          console.warn('Audio capture failed, continuing without speech analysis:', audioErr)
        }
      }
      
      console.log('🎥 Recording started with Python backend')
    } catch (err) {
      setError('Failed to connect to Python backend. Is it running at http://localhost:8000?')
      setIsRecording(false)
      console.error('Recording error:', err)
    }
  }

  // Stop recording/analysis
  const stopRecording = async () => {
    console.log('🛑 Stopping recording...')
    setIsRecording(false)
    
    // Get session ID before disconnecting
    const sessionId = wsClient.getCurrentSessionId()
    console.log('Session ID:', sessionId)
    setCurrentSessionId(sessionId)
    
    // Stop sending frames first
    wsClient.stopStreaming()
    
    // Stop audio capture
    try {
      await audioClient.stopCapture()
      console.log('🎤 Audio capture stopped')
    } catch (audioErr) {
      console.warn('Error stopping audio:', audioErr)
    }
    
    // Disconnect triggers backend's finally block (no wait needed)
    wsClient.disconnect()
    
    // Show processing message
    setProcessingComplete(true)
    
    // Poll backend to check if analysis is complete
    if (sessionId) {
      console.log('⏳ Polling for results...')
      pollForResults(sessionId)
    }
  }

  // Poll backend to check when analysis is ready
  const pollForResults = async (sessionId: string) => {
    let attempts = 0
    const maxAttempts = 240 // 240 checks * 250ms = 60 seconds max
    
    const checkInterval = setInterval(async () => {
      attempts++
      
      try {
        const response = await fetch(`http://localhost:8000/api/sessions/${sessionId}`)
        
        if (response.ok) {
          // Analysis is ready!
          console.log('✅ Analysis complete! Redirecting...')
          clearInterval(checkInterval)
          setProcessingComplete(false)
          router.push(`/results-python/${sessionId}`)
        } else if (attempts >= maxAttempts) {
          // Timeout - but provide manual redirect option
          console.error('⏱️ Timeout waiting for results')
          clearInterval(checkInterval)
          setProcessingComplete(false)
          setError(`Analysis took longer than expected. Session: ${sessionId}`)
          // Try to redirect anyway - session might exist now
          setTimeout(() => {
            router.push(`/results-python/${sessionId}`)
          }, 2000)
        } else if (attempts % 4 === 0) {
          // Log every 1 second (4 * 250ms)
          console.log(`⏳ Waiting... (${(attempts * 0.25).toFixed(1)}s)`)
        }
      } catch (err) {
        if (attempts >= maxAttempts) {
          console.error('❌ Failed to check results:', err)
          clearInterval(checkInterval)
          setProcessingComplete(false)
          setError(`Connection error. Session: ${sessionId}`)
          // Try to redirect anyway
          setTimeout(() => {
            router.push(`/results-python/${sessionId}`)
          }, 2000)
        }
      }
    }, 250) // Check every 250ms
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopWebcam()
      wsClient.disconnect()
      audioClient.stopCapture().catch(err => console.error('Cleanup audio error:', err))
    }
  }, [])

  return (
    <>
      {processingComplete && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '12px',
            maxWidth: '500px',
            color: '#000'
          }}>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
                ⏳ Generating Analysis...
              </h2>
              <p style={{ marginBottom: '1rem', lineHeight: 1.6 }}>
                Processing your presentation (typically 5-10 seconds):
              </p>
              <ul style={{ marginBottom: '1.5rem', paddingLeft: '1.5rem', lineHeight: 1.8 }}>
                <li>✅ Finalizing video</li>
                <li>✅ Calculating scores</li>
                <li>⏳ Generating AI coaching...</li>
              </ul>
              {currentSessionId && (
                <div style={{
                  padding: '0.75rem',
                  backgroundColor: '#f0f0f0',
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  marginBottom: '1rem',
                  fontFamily: 'monospace',
                  color: '#666'
                }}>
                  Session: {currentSessionId}
                </div>
              )}
              <div style={{
                padding: '1rem',
                backgroundColor: '#4CAF50',
                color: 'white',
                borderRadius: '8px',
                fontSize: '0.85rem',
                marginBottom: '1rem',
                textAlign: 'center'
              }}>
                <strong>🔄 Auto-redirecting when complete...</strong>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {currentSessionId && (
                  <button
                    onClick={() => {
                      setProcessingComplete(false)
                      router.push(`/results-python/${currentSessionId}`)
                    }}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      flex: 1
                    }}
                  >
                    View Results Now
                  </button>
                )}
                <button
                  onClick={() => {
                    setProcessingComplete(false)
                    router.push('/')
                  }}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    flex: currentSessionId ? 0 : 1,
                    minWidth: currentSessionId ? '100px' : undefined
                  }}
                >
                  Home
                </button>
              </div>
          </div>
        </div>
      )}
      
      <div style={{ 
        padding: '2rem', 
        maxWidth: '1200px', 
        margin: '0 auto',
        backgroundColor: '#ffffff',
        minHeight: '100vh',
        color: '#000000'
      }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#000000' }}>
        🦈 Shark Vision - Presentation Analysis
      </h1>
      
      {error && (
        <div style={{
          padding: '1rem',
          marginBottom: '1rem',
          backgroundColor: '#fee',
          border: '1px solid #fcc',
          borderRadius: '8px',
          color: '#c00'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {!isConnected && !isRecording && (
        <div style={{
          padding: '1rem',
          marginBottom: '1rem',
          backgroundColor: '#fef3cd',
          border: '1px solid #ffeeba',
          borderRadius: '8px',
          color: '#856404'
        }}>
          <strong>Note:</strong> Make sure Python backend is running at http://localhost:8000
          <br />
          Run: <code>cd backend && python main.py</code>
        </div>
      )}

      <div style={{ maxWidth: '900px', margin: '0 auto', marginBottom: '2rem' }}>
        {/* Video Panel */}
        <div>
          <div style={{
            position: 'relative',
            backgroundColor: '#000',
            borderRadius: '8px',
            overflow: 'hidden',
            aspectRatio: '16/9'
          }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
            
            {noDetection && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                backgroundColor: 'rgba(255, 0, 0, 0.8)',
                color: 'white',
                padding: '1rem 2rem',
                borderRadius: '8px',
                fontSize: '1.2rem',
                fontWeight: 'bold'
              }}>
                ⚠️ No Person Detected
              </div>
            )}

            {isRecording && (
              <div style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                backgroundColor: 'rgba(255, 0, 0, 0.9)',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '20px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  backgroundColor: 'white',
                  borderRadius: '50%',
                  animation: 'pulse 1s infinite'
                }} />
                ANALYZING
              </div>
            )}
          </div>

          {/* Controls */}
          <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
            {!stream ? (
              <button
                onClick={startWebcam}
                style={{
                  padding: '1rem 2rem',
                  fontSize: '1rem',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                📹 Start Webcam
              </button>
            ) : !isRecording ? (
              <>
                <button
                  onClick={startRecording}
                  style={{
                    padding: '1rem 2rem',
                    fontSize: '1rem',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    flex: 1
                  }}
                >
                  🎬 Start Analysis
                </button>
                <button
                  onClick={stopWebcam}
                  style={{
                    padding: '1rem 2rem',
                    fontSize: '1rem',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  Stop Webcam
                </button>
              </>
            ) : (
              <button
                onClick={stopRecording}
                style={{
                  padding: '1rem 2rem',
                  fontSize: '1rem',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  flex: 1
                }}
              >
                🛑 Stop Analysis
              </button>
            )}
          </div>
          
          {/* Progress Indicator */}
          {isRecording && (
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.9rem', color: '#555', marginBottom: '0.5rem' }}>
                {isConnected ? '🟢 Analyzing' : '⚪ Connecting...'}
              </div>
              <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#000' }}>
                {frameCount} frames processed
              </div>
              <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
                {elapsedTime.toFixed(1)}s elapsed
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Feature Comparison */}
      <div style={{
        padding: '1.5rem',
        backgroundColor: '#e7f3ff',
        borderRadius: '8px',
        marginTop: '2rem'
      }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>
          📊 Analysis Features
        </h3>
        <div style={{ 
          padding: '0.75rem', 
          backgroundColor: '#fff', 
          borderRadius: '6px', 
          marginBottom: '1rem',
          fontSize: '0.9rem',
          color: '#555'
        }}>
          💡 <strong>Note:</strong> Full analysis with detailed scores and AI coaching will be shown after you stop recording.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: '#000' }}>Total Landmarks</div>
            <div style={{ fontSize: '1.5rem', color: '#000' }}>543</div>
          </div>
          <div>
            <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: '#000' }}>Face Landmarks</div>
            <div style={{ fontSize: '1.5rem', color: '#000' }}>468</div>
          </div>
          <div>
            <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: '#000' }}>Hand Tracking</div>
            <div style={{ fontSize: '1.5rem', color: '#000' }}>42 points</div>
          </div>
          <div>
            <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: '#000' }}>Pose Points</div>
            <div style={{ fontSize: '1.5rem', color: '#000' }}>33</div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
        <a href="/" style={{ color: '#007bff', textDecoration: 'none' }}>
          ← Back to Home
        </a>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}      </style>
    </div>
    </>
  )
}

