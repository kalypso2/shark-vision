'use client'

/**
 * Python Backend Analysis Page
 * Uses MediaPipe Holistic (543 landmarks) via WebSocket
 */

import { useEffect, useRef, useState } from 'react'
import { AnalysisWebSocketClient, RealtimeUpdate, FinalAnalysis, AnalysisMetrics } from '@/lib/websocket_client'
import { useRouter } from 'next/navigation'

export default function PythonAnalysisPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const router = useRouter()
  
  const [wsClient] = useState(() => new AnalysisWebSocketClient('ws://localhost:8000/ws/analyze'))
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

    wsClient.onUpdate = (data: RealtimeUpdate) => {
      setLiveStatus(data.live_status)  // Use live status instead of metrics
      setFrameCount(data.frame)
      setElapsedTime(data.timestamp)
      setNoDetection(false)
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
      
      // Set video element
      wsClient.setVideoElement(videoRef.current)
      
      // Start streaming frames
      await wsClient.startStreaming(10) // 10 FPS
      
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
    
    // Stop sending frames first
    wsClient.stopStreaming()
    
    // Wait a moment for any pending frames to finish
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Disconnect triggers backend's finally block
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
    const maxAttempts = 60 // 60 seconds max
    
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
          // Timeout
          console.error('⏱️ Timeout waiting for results')
          clearInterval(checkInterval)
          setError('Analysis timeout. Check terminal for session ID.')
        } else {
          console.log(`⏳ Waiting... (${attempts}s)`)
        }
      } catch (err) {
        if (attempts >= maxAttempts) {
          console.error('❌ Failed to check results:', err)
          clearInterval(checkInterval)
          setError('Failed to retrieve results. Check terminal for session ID.')
        }
      }
    }, 1000) // Check every 1 second
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopWebcam()
      wsClient.disconnect()
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
              Processing your presentation (10-30 seconds):
            </p>
            <ul style={{ marginBottom: '1.5rem', paddingLeft: '1.5rem', lineHeight: 1.8 }}>
              <li>✅ Finalizing video</li>
              <li>✅ Calculating scores</li>
              <li>⏳ Generating AI coaching...</li>
            </ul>
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
            <button
              onClick={() => {
                setProcessingComplete(false)
                router.push('/')
              }}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                width: '100%'
              }}
            >
              Return to Home
            </button>
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

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
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
        </div>

        {/* Real-time Metrics Panel */}
        <div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Real-Time Metrics</h2>
          
          <div style={{
            padding: '1rem',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            marginBottom: '1rem'
          }}>
            <div style={{ fontSize: '0.9rem', color: '#555', marginBottom: '0.5rem' }}>Status</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: isConnected ? '#28a745' : '#6c757d' }}>
              {isConnected ? '🟢 Connected' : '⚪ Disconnected'}
            </div>
          </div>

          <div style={{
            padding: '1rem',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            marginBottom: '1rem'
          }}>
            <div style={{ fontSize: '0.9rem', color: '#555', marginBottom: '0.5rem' }}>Frames Processed</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#000' }}>{frameCount}</div>
            <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.25rem' }}>
              {elapsedTime.toFixed(1)}s elapsed
            </div>
          </div>

          {liveStatus && (
            <>
              <div style={{
                padding: '1rem',
                backgroundColor: liveStatus.posture === 'good' ? '#28a745' : '#dc3545',
                borderRadius: '8px',
                marginBottom: '1rem',
                color: 'white'
              }}>
                <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>Posture</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                  {liveStatus.posture === 'good' ? '✅ GOOD' : '❌ BAD'}
                </div>
              </div>

              <div style={{
                padding: '1rem',
                backgroundColor: liveStatus.smile === 'good' ? '#28a745' : '#6c757d',
                borderRadius: '8px',
                marginBottom: '1rem',
                color: 'white'
              }}>
                <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>Smile</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                  {liveStatus.smile === 'good' ? '😊 SMILING' : '😐 NEUTRAL'}
                </div>
              </div>

              <div style={{
                padding: '1rem',
                backgroundColor: liveStatus.gestures === 'good' ? '#28a745' : '#dc3545',
                borderRadius: '8px',
                marginBottom: '1rem',
                color: 'white'
              }}>
                <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>Gestures</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                  {liveStatus.gestures === 'good' ? '👍 GOOD' : '❌ LOW'}
                </div>
              </div>

              <div style={{
                padding: '1rem',
                backgroundColor: liveStatus.eye_contact === 'good' ? '#28a745' : '#dc3545',
                borderRadius: '8px',
                marginBottom: '1rem',
                color: 'white'
              }}>
                <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>Eye Contact</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                  {liveStatus.eye_contact === 'good' ? '👁️ GOOD' : '👀 OFF'}
                </div>
              </div>

              <div style={{
                padding: '1rem',
                backgroundColor: liveStatus.engagement === 'good' ? '#28a745' : '#ffc107',
                borderRadius: '8px',
                color: liveStatus.engagement === 'good' ? 'white' : '#000'
              }}>
                <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>Engagement</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                  {liveStatus.engagement === 'good' ? '⚡ ENGAGED' : '💤 LOW'}
                </div>
              </div>
            </>
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

