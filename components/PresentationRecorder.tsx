'use client'

/**
 * Presentation Recorder Component
 * Main component for recording presentations with body language analysis
 */

import { useRef, useState, useEffect, useCallback } from 'react'
import { BodyLanguageAnalyzer } from '@/lib/body_language/analyzer'
import { VideoRecorder } from '@/lib/video_recorder'
import type { BodyLanguageAnalysis } from '@/lib/body_language/types'

interface RecordingStatus {
  isRecording: boolean
  isProcessing: boolean
  duration: number
  framesProcessed: number
  error: string | null
}

export default function PresentationRecorder() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [status, setStatus] = useState<RecordingStatus>({
    isRecording: false,
    isProcessing: false,
    duration: 0,
    framesProcessed: 0,
    error: null,
  })
  const [modelLoading, setModelLoading] = useState(false)
  const [modelLoaded, setModelLoaded] = useState(false)

  // Refs for recorder and analyzer
  const analyzerRef = useRef<BodyLanguageAnalyzer | null>(null)
  const videoRecorderRef = useRef<VideoRecorder | null>(null)
  const startTimeRef = useRef<number>(0)
  const animationFrameRef = useRef<number | null>(null)
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize analyzer on mount
  useEffect(() => {
    const initAnalyzer = async () => {
      if (!analyzerRef.current) {
        setModelLoading(true)
        try {
          const analyzer = new BodyLanguageAnalyzer()
          await analyzer.initialize()
          analyzerRef.current = analyzer
          setModelLoaded(true)
          console.log('Analyzer initialized')
        } catch (error) {
          console.error('Failed to initialize analyzer:', error)
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          console.error('Error details:', errorMessage)
          
          let userMessage = 'Failed to load AI model. '
          if (errorMessage.includes('backend')) {
            userMessage += 'WebGL not supported. Try using Chrome or updating your browser.'
          } else {
            userMessage += 'Please refresh the page or try a different browser.'
          }
          
          setStatus(prev => ({
            ...prev,
            error: userMessage,
          }))
        } finally {
          setModelLoading(false)
        }
      }
    }

    initAnalyzer()

    return () => {
      // Cleanup
      if (analyzerRef.current) {
        analyzerRef.current.dispose()
      }
      if (videoRecorderRef.current) {
        videoRecorderRef.current.dispose()
      }
    }
  }, [])

  // Start webcam
  const startWebcam = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: false,
      })

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        setStream(mediaStream)
      }
    } catch (error) {
      console.error('Error accessing webcam:', error)
      setStatus(prev => ({
        ...prev,
        error: 'Failed to access webcam. Please grant camera permissions.',
      }))
    }
  }

  // Stop webcam
  const stopWebcam = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
    }
  }

  // Process frame loop
  const processFrameLoop = useCallback((currentTime: number) => {
    if (!videoRef.current || !analyzerRef.current) {
      return
    }

    analyzerRef.current.processFrame(videoRef.current, currentTime).then(processed => {
      if (processed) {
        setStatus(prev => ({
          ...prev,
          framesProcessed: analyzerRef.current?.getBufferSize() || 0,
        }))
      }
    })

    animationFrameRef.current = requestAnimationFrame(processFrameLoop)
  }, [])

  // Start recording
  const startRecording = async () => {
    if (!stream || !analyzerRef.current) {
      return
    }

    try {
      // Initialize video recorder
      videoRecorderRef.current = new VideoRecorder()
      await videoRecorderRef.current.startRecording(stream)

      // Start analyzer
      analyzerRef.current.start()
      startTimeRef.current = Date.now()

      // Start frame processing loop
      animationFrameRef.current = requestAnimationFrame(processFrameLoop)

      // Start duration counter
      durationIntervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000
        setStatus(prev => ({ ...prev, duration: elapsed }))
      }, 100)

      setStatus(prev => ({
        ...prev,
        isRecording: true,
        error: null,
      }))
    } catch (error) {
      console.error('Error starting recording:', error)
      setStatus(prev => ({
        ...prev,
        error: 'Failed to start recording',
      }))
    }
  }

  // Stop recording
  const stopRecording = async () => {
    if (!videoRecorderRef.current || !analyzerRef.current) {
      return
    }

    setStatus(prev => ({ ...prev, isRecording: false, isProcessing: true }))

    // Stop frame processing
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    // Stop duration counter
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current)
      durationIntervalRef.current = null
    }

    try {
      // Stop video recording
      const videoBlob = await videoRecorderRef.current.stopRecording()

      // Generate analysis
      const sessionId = `session_${Date.now()}`
      const videoResolution = {
        width: videoRef.current?.videoWidth || 1280,
        height: videoRef.current?.videoHeight || 720,
      }
      const analysis = analyzerRef.current.generateAnalysis(sessionId, videoResolution)

      // Upload to server
      await uploadPresentation(videoBlob, analysis)

      // Reset
      analyzerRef.current.reset()
      setStatus({
        isRecording: false,
        isProcessing: false,
        duration: 0,
        framesProcessed: 0,
        error: null,
      })

      // Redirect to results
      window.location.href = `/results/${sessionId}`
    } catch (error) {
      console.error('Error processing recording:', error)
      setStatus(prev => ({
        ...prev,
        isProcessing: false,
        error: 'Failed to process recording',
      }))
    }
  }

  // Upload presentation to server
  const uploadPresentation = async (
    videoBlob: Blob,
    analysis: BodyLanguageAnalysis
  ): Promise<void> => {
    const formData = new FormData()
    formData.append('video', videoBlob, 'presentation.webm')
    formData.append('analysis', JSON.stringify(analysis))

    const response = await fetch('/api/presentations/upload', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      throw new Error('Failed to upload presentation')
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
      }
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
      {/* Video Preview */}
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
        {!stream && (
          <div style={{
            position: 'absolute',
            textAlign: 'center',
            color: '#888',
          }}>
            <p>Click &ldquo;Start Webcam&rdquo; to begin</p>
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
            display: stream ? 'block' : 'none',
          }}
        />

        {/* Recording indicator */}
        {status.isRecording && (
          <div style={{
            position: 'absolute',
            top: '1rem',
            left: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: 'rgba(255, 0, 0, 0.8)',
            padding: '0.5rem 1rem',
            borderRadius: '0.5rem',
            color: '#fff',
            fontWeight: 'bold',
          }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: '#fff',
              animation: 'pulse 1s infinite',
            }} />
            REC {status.duration.toFixed(1)}s
          </div>
        )}

        {/* Status overlay */}
        {status.isRecording && (
          <div style={{
            position: 'absolute',
            bottom: '1rem',
            left: '1rem',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            padding: '0.5rem 1rem',
            borderRadius: '0.5rem',
            color: '#fff',
            fontSize: '0.875rem',
          }}>
            Frames analyzed: {status.framesProcessed}
          </div>
        )}
      </div>

      {/* Error message */}
      {status.error && (
        <div style={{
          width: '100%',
          padding: '1rem',
          backgroundColor: 'rgba(255, 107, 107, 0.2)',
          border: '1px solid #ff6b6b',
          borderRadius: '0.5rem',
          color: '#ff6b6b',
        }}>
          {status.error}
        </div>
      )}

      {/* Model loading indicator */}
      {modelLoading && (
        <div style={{
          padding: '1rem',
          color: '#fff',
          textAlign: 'center',
        }}>
          Loading AI model...
        </div>
      )}

      {/* Controls */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        flexWrap: 'wrap',
        justifyContent: 'center',
      }}>
        {!stream ? (
          <button
            onClick={startWebcam}
            disabled={modelLoading}
            style={{
              padding: '0.75rem 2rem',
              fontSize: '1rem',
              fontWeight: '600',
              color: '#fff',
              backgroundColor: modelLoading ? '#888' : '#667eea',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: modelLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
            }}
          >
            {modelLoading ? 'Loading Model...' : 'Start Webcam'}
          </button>
        ) : !status.isRecording ? (
          <>
            <button
              onClick={startRecording}
              disabled={!modelLoaded || status.isProcessing}
              style={{
                padding: '0.75rem 2rem',
                fontSize: '1rem',
                fontWeight: '600',
                color: '#fff',
                backgroundColor: '#51cf66',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
              }}
            >
              Start Recording
            </button>
            <button
              onClick={stopWebcam}
              style={{
                padding: '0.75rem 2rem',
                fontSize: '1rem',
                fontWeight: '600',
                color: '#fff',
                backgroundColor: '#888',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
              }}
            >
              Stop Webcam
            </button>
          </>
        ) : (
          <button
            onClick={stopRecording}
            disabled={status.isProcessing}
            style={{
              padding: '0.75rem 2rem',
              fontSize: '1rem',
              fontWeight: '600',
              color: '#fff',
              backgroundColor: status.isProcessing ? '#888' : '#ff6b6b',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: status.isProcessing ? 'not-allowed' : 'pointer',
            }}
          >
            {status.isProcessing ? 'Processing...' : 'Stop Recording'}
          </button>
        )}
      </div>
    </div>
  )
}

