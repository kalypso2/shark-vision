/**
 * WebSocket Client for Python Backend
 * Streams video frames and receives real-time analysis
 */

export interface AnalysisMetrics {
  posture?: {
    score: number
    shoulder_alignment: number
    spine_quality: number
    is_good: boolean
  }
  facial?: {
    smile?: number
    eyebrow_raise?: number
    mouth_open?: number
  }
  gesture?: {
    movement: number
    symmetry: number
    quality: number
    hand_shapes?: {
      left?: string
      right?: string
    }
  }
  gaze?: {
    direction: string
    is_forward: boolean
    offset_x?: number
    offset_y?: number
    method?: string
  }
  movement?: {
    amount: number
    type: string
  }
}

export interface AnalysisEvent {
  type: string
  subtype: string
  timestamp: number
  confidence?: number
  [key: string]: any
}

export interface LiveStatus {
  posture: 'good' | 'bad'
  eye_contact: 'good' | 'bad'
  gestures: 'good' | 'bad'
  smile: 'good' | 'neutral'
  engagement: 'good' | 'low'
}

export interface SessionIdMessage {
  type: 'session_id'
  session_id: string
}

export interface RealtimeUpdate {
  type: 'update'
  frame: number
  timestamp: number
  live_status: LiveStatus  // Simple good/bad indicators for LIVE view
  metrics: AnalysisMetrics  // Full metrics (for debugging)
  events: AnalysisEvent[]
  landmarks: {
    pose: number
    face: number
    hands: number
  }
}

export interface FinalAnalysis {
  type: 'final'
  session_id: string
  analysis: {
    session_id: string
    session_meta: {
      duration_seconds: number
      total_frames: number
      fps: number
      landmarks_per_frame: number
      total_landmarks_processed: number
    }
    aggregates: {
      posture_score: number
      eye_contact_proxy: number
      gesture_quality: number
      gesture_frequency: number
      engagement_score: number
      smile_frequency: number
    }
    timeline: AnalysisEvent[]
    debug: {
      metrics_count: number
      events_count: number
    }
  }
  coaching: string
  rag_context: {
    definitions_used: number
    benchmarks_used: number
    techniques_recommended: number
  }
}

export type WebSocketMessage = SessionIdMessage | RealtimeUpdate | FinalAnalysis | { type: 'no_detection'; message: string }

export class AnalysisWebSocketClient {
  private ws: WebSocket | null = null
  private videoElement: HTMLVideoElement | null = null
  private canvasElement: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private streaming = false
  private streamInterval: NodeJS.Timeout | null = null
  private currentSessionId: string | null = null
  
  // Callbacks
  public onUpdate: ((data: RealtimeUpdate) => void) | null = null
  public onFinal: ((data: FinalAnalysis) => void) | null = null
  public onError: ((error: string) => void) | null = null
  public onNoDetection: (() => void) | null = null
  public onConnect: (() => void) | null = null
  public onDisconnect: (() => void) | null = null

  constructor(backendUrl: string = 'ws://localhost:8000/ws/analyze') {
    this.backendUrl = backendUrl
  }

  private backendUrl: string

  getCurrentSessionId(): string | null {
    return this.currentSessionId
  }

  /**
   * Connect to Python backend WebSocket
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.backendUrl)
        this.ws.binaryType = 'blob'

        this.ws.onopen = () => {
          console.log('🔌 Connected to Python backend')
          console.log('⏳ Waiting for session ID from backend...')
          if (this.onConnect) this.onConnect()
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const data: WebSocketMessage = JSON.parse(event.data)
            
            if (data.type === 'session_id') {
              // Backend sent us the real session ID
              this.currentSessionId = data.session_id
              console.log('✅ Received session ID from backend:', this.currentSessionId)
            } else if (data.type === 'update') {
              if (this.onUpdate) this.onUpdate(data as RealtimeUpdate)
            } else if (data.type === 'final') {
              if (this.onFinal) this.onFinal(data as FinalAnalysis)
              this.stopStreaming()
            } else if (data.type === 'no_detection') {
              if (this.onNoDetection) this.onNoDetection()
            }
          } catch (e) {
            console.error('Error parsing WebSocket message:', e)
          }
        }

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          if (this.onError) this.onError('WebSocket connection error')
          reject(error)
        }

        this.ws.onclose = () => {
          console.log('🔌 Disconnected from Python backend')
          this.stopStreaming()
          if (this.onDisconnect) this.onDisconnect()
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Set video source
   */
  setVideoElement(video: HTMLVideoElement) {
    this.videoElement = video
    
    // Create canvas for frame capture
    if (!this.canvasElement) {
      this.canvasElement = document.createElement('canvas')
      this.ctx = this.canvasElement.getContext('2d')
    }
  }

  /**
   * Start streaming video frames to backend
   */
  startStreaming(fps: number = 10) {
    if (!this.videoElement || !this.canvasElement || !this.ctx) {
      throw new Error('Video element not set. Call setVideoElement() first.')
    }

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected. Call connect() first.')
    }

    this.streaming = true
    const intervalMs = 1000 / fps

    this.streamInterval = setInterval(() => {
      if (!this.streaming || !this.videoElement || !this.canvasElement || !this.ctx) {
        return
      }

      // Set canvas size to video size
      if (this.canvasElement.width !== this.videoElement.videoWidth) {
        this.canvasElement.width = this.videoElement.videoWidth
        this.canvasElement.height = this.videoElement.videoHeight
      }

      // Draw current video frame to canvas
      this.ctx.drawImage(this.videoElement, 0, 0)

      // Convert to JPEG and send
      this.canvasElement.toBlob(
        (blob) => {
          if (blob && this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(blob)
          }
        },
        'image/jpeg',
        0.8 // Quality: 80%
      )
    }, intervalMs)

    console.log(`📹 Streaming at ${fps} FPS`)
  }

  /**
   * Stop streaming
   */
  stopStreaming() {
    this.streaming = false
    if (this.streamInterval) {
      clearInterval(this.streamInterval)
      this.streamInterval = null
    }
  }

  /**
   * Disconnect from backend
   * Backend will send 'final' message before closing connection
   */
  disconnect() {
    this.stopStreaming()
    if (this.ws) {
      console.log('Closing WebSocket connection...')
      // Just close - don't set to null yet, backend needs to send final message
      this.ws.close()
      // Will be set to null in onclose handler
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }

  /**
   * Check if streaming
   */
  isStreaming(): boolean {
    return this.streaming
  }
}

