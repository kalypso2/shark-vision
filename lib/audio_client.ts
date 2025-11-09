/**
 * Audio Capture and Upload Client
 * Captures audio from microphone and sends chunks to backend for speech analysis
 */

export class AudioClient {
  private mediaRecorder: MediaRecorder | null = null
  private audioChunks: Blob[] = []
  private sessionId: string | null = null
  private uploadInterval: NodeJS.Timeout | null = null
  private backendUrl: string
  private mimeType: string | null = null
  
  constructor(backendUrl: string = 'http://localhost:8000') {
    this.backendUrl = backendUrl
  }
  
  /**
   * Start capturing audio
   */
  async startCapture(sessionId: string): Promise<void> {
    try {
      this.sessionId = sessionId
      
      // Get audio stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000
        }
      })
      
      // Determine supported audio mime type (prefer OGG for Google Speech API)
      const preferredTypes = [
        'audio/ogg;codecs=opus',
        'audio/ogg; codecs=opus',
        'audio/webm;codecs=opus',
        'audio/webm; codecs=opus',
        'audio/webm'
      ]
      const supportedType = preferredTypes.find(type => MediaRecorder.isTypeSupported(type)) || ''

      if (!supportedType) {
        console.warn('🎤 No preferred audio mime types supported, falling back to browser default')
      } else {
        console.log(`🎤 Using audio mime type: ${supportedType}`)
      }

      this.mimeType = supportedType || null
      this.mediaRecorder = supportedType
        ? new MediaRecorder(stream, { mimeType: supportedType })
        : new MediaRecorder(stream)
      
      this.audioChunks = []
      
      // Collect audio data
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data)
        }
      }

      this.mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop())
      }
      
      // Start recording with 5s timeslice to emit periodic chunks
      this.mediaRecorder.start(5000)
      console.log('🎤 Audio capture started')
      
      // Upload chunks every 5 seconds (aligned with timeslice)
      this.uploadInterval = setInterval(() => {
        this.uploadAudioChunk()
      }, 5000)
      
    } catch (error) {
      console.error('Failed to start audio capture:', error)
      throw error
    }
  }
  
  /**
   * Upload accumulated audio chunk
   */
  private async uploadAudioChunk(): Promise<void> {
    if (!this.sessionId) {
      return
    }

    try {
      // Request the recorder to flush any buffered data
      if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
        this.mediaRecorder.requestData()
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      if (this.audioChunks.length === 0) {
        return
      }

      const mimeType = this.mimeType || 'audio/webm;codecs=opus'
      const contentType = mimeType.split(';')[0] || 'audio/webm'

      // Create blob from accumulated chunks
      const audioBlob = new Blob(this.audioChunks, { type: mimeType })
      this.audioChunks = [] // Clear chunks

      // Upload to backend
      const response = await fetch(`${this.backendUrl}/api/sessions/${this.sessionId}/audio`, {
        method: 'POST',
        headers: {
          'Content-Type': contentType
        },
        body: audioBlob
      })

      if (!response.ok) {
        console.error('Failed to upload audio chunk:', await response.text())
      } else {
        console.log('🎤 Audio chunk uploaded')
      }

    } catch (error) {
      console.error('Error uploading audio chunk:', error)
    }
  }
  
  /**
   * Stop capturing audio
   */
  async stopCapture(): Promise<void> {
    // Stop interval
    if (this.uploadInterval) {
      clearInterval(this.uploadInterval)
      this.uploadInterval = null
    }

    // Stop recorder to flush final data
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop()
      await new Promise(resolve => setTimeout(resolve, 200))
    }

    // Upload any remaining chunks
    if (this.audioChunks.length > 0) {
      await this.uploadAudioChunk()
    }

    this.mediaRecorder = null
    this.audioChunks = []
    this.mimeType = null
    this.sessionId = null
    console.log('🎤 Audio capture stopped')
  }

  /**
   * Check if currently capturing
   */
  isCapturing(): boolean {
    return this.mediaRecorder !== null && this.mediaRecorder.state === 'recording'
  }
}

