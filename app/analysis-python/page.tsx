'use client'

/**
 * Python Backend Analysis Page
 * Uses MediaPipe Holistic (543 landmarks) via WebSocket
 */

import { useEffect, useRef, useState } from 'react'
import { AnalysisWebSocketClient, RealtimeUpdate, FinalAnalysis, AnalysisMetrics } from '@/lib/websocket_client'
import { AudioClient } from '@/lib/audio_client'
import { useRouter } from 'next/navigation'
import { VRModeButton } from './components/VRModeButton'

export default function PythonAnalysisPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const router = useRouter()
  
  // State to track if we're on ngrok (set after mount to avoid hydration mismatch)
  const [backendConfig, setBackendConfig] = useState({
    host: 'localhost:8000',
    wsProtocol: 'ws://',
    httpProtocol: 'http://'
  })
  
  // Initialize clients after mount (to avoid server/client mismatch)
  const [wsClient, setWsClient] = useState<AnalysisWebSocketClient | null>(null)
  const [audioClient, setAudioClient] = useState<AudioClient | null>(null)
  
  // Detect ngrok and set backend config + initialize clients after component mounts
  useEffect(() => {
    const isNgrok = window.location.hostname.includes('ngrok')
    
    if (isNgrok) {
      const config = {
        host: 'shark-backend.ngrok.io',
        wsProtocol: 'wss://',
        httpProtocol: 'https://'
      }
      setBackendConfig(config)
      console.log('🔧 Using ngrok backend: https://shark-backend.ngrok.io')
      
      // Initialize clients with ngrok URLs
      setWsClient(new AnalysisWebSocketClient(`${config.wsProtocol}${config.host}/ws/analyze`))
      setAudioClient(new AudioClient(`${config.httpProtocol}${config.host}`))
    } else {
      console.log('🔧 Using local backend: http://localhost:8000')
      
      // Initialize clients with local URLs
      const config = backendConfig
      setWsClient(new AnalysisWebSocketClient(`${config.wsProtocol}${config.host}/ws/analyze`))
      setAudioClient(new AudioClient(`${config.httpProtocol}${config.host}`))
    }
  }, [])
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [vrSession, setVrSession] = useState<XRSession | null>(null)
  
  // Real-time status (not scores)
  const [liveStatus, setLiveStatus] = useState<any>(null)
  const [frameCount, setFrameCount] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [noDetection, setNoDetection] = useState(false)
  const [processingComplete, setProcessingComplete] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)

  // Setup WebSocket callbacks
  useEffect(() => {
    if (!wsClient) return
    
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
      console.log('🎥 Requesting camera access...')
      
      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not available. This page must be served over HTTPS to access the camera on Quest browser. Current URL: ' + window.location.href)
      }
      
      let mediaStream: MediaStream | null = null
      
      // STRATEGY 1: Try environment camera first (Quest passthrough/front camera)
      // This is most likely to give you the physical camera view
      try {
        console.log('🎯 Attempting environment-facing camera (Quest passthrough)...')
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { exact: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        })
        console.log('✅ Got environment camera')
      } catch (envError) {
        console.warn('Environment camera not available:', envError)
        
        // STRATEGY 2: Try user-facing camera
        try {
          console.log('🎯 Attempting user-facing camera...')
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: 'user',
              width: { ideal: 1280 },
              height: { ideal: 720 }
            },
            audio: false
          })
          console.log('✅ Got user-facing camera')
        } catch (userError) {
          console.warn('User-facing camera failed:', userError)
          
          // STRATEGY 3: List all devices and filter out avatar
          const devices = await navigator.mediaDevices.enumerateDevices()
          const videoDevices = devices.filter(device => device.kind === 'videoinput')
          
          console.log('📹 Available cameras:', videoDevices.map(d => ({
            label: d.label,
            id: d.deviceId.substring(0, 20) + '...'
          })))
          
          // Find first non-avatar camera
          const physicalCamera = videoDevices.find(device => {
            const label = device.label.toLowerCase()
            return !label.includes('avatar') && 
                   !label.includes('virtual') &&
                   !label.includes('meta avatar')
          })
          
          if (physicalCamera) {
            console.log('🎯 Found physical camera:', physicalCamera.label)
            mediaStream = await navigator.mediaDevices.getUserMedia({
              video: {
                deviceId: { exact: physicalCamera.deviceId }
              },
              audio: false
            })
            console.log('✅ Got physical camera via deviceId')
          } else {
            // STRATEGY 4: Just try any camera without constraints
            console.log('🎯 Attempting any available camera...')
            mediaStream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false
            })
            console.log('✅ Got default camera')
          }
        }
      }

      if (videoRef.current && mediaStream) {
        videoRef.current.srcObject = mediaStream
        setStream(mediaStream)
        
        // Log the actual track being used
        const videoTrack = mediaStream.getVideoTracks()[0]
        const settings = videoTrack.getSettings()
        console.log('📹 Active camera:', videoTrack.label)
        console.log('📹 Settings:', {
          facingMode: settings.facingMode,
          width: settings.width,
          height: settings.height,
          deviceId: settings.deviceId?.substring(0, 20) + '...'
        })
        
        try {
          await videoRef.current.play()
          console.log('▶️ Video playing')
        } catch (playError) {
          console.warn('Video play was interrupted:', playError)
        }
      }
    } catch (err: any) {
      let errorMsg = ''
      
      if (err.message && err.message.includes('HTTPS')) {
        errorMsg = '🔒 HTTPS Required: Quest Browser requires HTTPS to access camera. You need to:\n\n1. Set up HTTPS with a self-signed certificate, OR\n2. Use ngrok/cloudflare tunnel to get HTTPS, OR\n3. Use the VR Mode button instead (WebXR doesn\'t need camera access)'
      } else if (err.name === 'NotAllowedError') {
        errorMsg = '⚠️ Camera permission denied. Please allow camera access in browser settings and refresh.'
      } else if (err.name === 'NotFoundError') {
        errorMsg = '⚠️ No camera found. Make sure your device has a camera.'
      } else {
        errorMsg = `⚠️ Failed to access camera: ${err.message}`
      }
      
      setError(errorMsg)
      console.error('Webcam error:', err)
      alert(errorMsg)
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

  // VR Mode Handlers
  const handleVRStart = (session: XRSession) => {
    setVrSession(session)
    console.log('🥽 VR session started')
    // Note: In VR mode, the camera feed would come from the XR session
    // This is a placeholder - full implementation would need XRWebGLLayer setup
  }

  const handleVREnd = () => {
    setVrSession(null)
    console.log('👋 VR session ended')
    // Clean up any VR-specific resources
    if (stream) {
      stopWebcam()
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

      // Check if clients are initialized
      if (!wsClient || !audioClient) {
        throw new Error('Backend clients not initialized')
      }

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
      setError(`Failed to connect to Python backend. Is it running at ${backendConfig.httpProtocol}${backendConfig.host}?`)
      setIsRecording(false)
      console.error('Recording error:', err)
    }
  }

  // Stop recording/analysis
  const stopRecording = async () => {
    console.log('🛑 Stopping recording...')
    setIsRecording(false)
    
    if (!wsClient || !audioClient) return
    
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
        const response = await fetch(`${backendConfig.httpProtocol}${backendConfig.host}/api/sessions/${sessionId}`)
        
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
      if (wsClient) wsClient.disconnect()
      if (audioClient) audioClient.stopCapture().catch(err => console.error('Cleanup audio error:', err))
    }
  }, [wsClient, audioClient])

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
          <strong>Note:</strong> Make sure Python backend is running at {backendConfig.httpProtocol}{backendConfig.host}
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
          <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {/* VR Mode Button */}
            <VRModeButton 
              onVRStart={handleVRStart}
              onVREnd={handleVREnd}
            />
            
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
                  disabled={!wsClient || !audioClient}
                  style={{
                    padding: '1rem 2rem',
                    fontSize: '1rem',
                    backgroundColor: (!wsClient || !audioClient) ? '#6c757d' : '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: (!wsClient || !audioClient) ? 'not-allowed' : 'pointer',
                    fontWeight: 'bold',
                    flex: 1,
                    opacity: (!wsClient || !audioClient) ? 0.6 : 1
                  }}
                >
                  {(!wsClient || !audioClient) ? '⏳ Initializing...' : '🎬 Start Analysis'}
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

