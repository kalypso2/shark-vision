/**
 * Video Recorder
 * Wrapper for MediaRecorder API to record webcam video
 */

export interface RecorderOptions {
  videoBitsPerSecond?: number
  mimeType?: string
}

export class VideoRecorder {
  private mediaRecorder: MediaRecorder | null = null
  private recordedChunks: Blob[] = []
  private stream: MediaStream | null = null

  /**
   * Start recording from a media stream
   */
  async startRecording(
    stream: MediaStream,
    options?: RecorderOptions
  ): Promise<void> {
    this.recordedChunks = []
    this.stream = stream

    // Determine best MIME type
    const mimeType = options?.mimeType || this.getBestMimeType()
    
    const recorderOptions: MediaRecorderOptions = {
      mimeType,
      videoBitsPerSecond: options?.videoBitsPerSecond || 2500000, // 2.5 Mbps
    }

    try {
      this.mediaRecorder = new MediaRecorder(stream, recorderOptions)

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data)
        }
      }

      this.mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event)
      }

      // Request data every second for progressive storage
      this.mediaRecorder.start(1000)
      console.log('Recording started with', mimeType)
    } catch (error) {
      console.error('Failed to start recording:', error)
      throw new Error('Failed to start video recording')
    }
  }

  /**
   * Stop recording and return the video blob
   */
  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No recording in progress'))
        return
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, {
          type: this.mediaRecorder?.mimeType || 'video/webm',
        })
        this.recordedChunks = []
        resolve(blob)
      }

      try {
        this.mediaRecorder.stop()
        console.log('Recording stopped')
      } catch (error) {
        console.error('Error stopping recording:', error)
        reject(error)
      }
    })
  }

  /**
   * Check if currently recording
   */
  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording'
  }

  /**
   * Get the current recording state
   */
  getState(): RecordingState | null {
    return this.mediaRecorder?.state || null
  }

  /**
   * Get recording duration in seconds
   */
  getDuration(): number {
    // Note: MediaRecorder doesn't provide duration directly
    // This would need to be tracked externally
    return 0
  }

  /**
   * Pause recording (if supported)
   */
  pause(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause()
    }
  }

  /**
   * Resume recording (if paused)
   */
  resume(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume()
    }
  }

  /**
   * Get the best supported MIME type for recording
   */
  private getBestMimeType(): string {
    const types = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=h264,opus',
      'video/webm',
      'video/mp4',
    ]

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type
      }
    }

    return 'video/webm' // Fallback
  }

  /**
   * Get file extension for the current MIME type
   */
  getFileExtension(): string {
    const mimeType = this.mediaRecorder?.mimeType || 'video/webm'
    
    if (mimeType.includes('webm')) {
      return 'webm'
    } else if (mimeType.includes('mp4')) {
      return 'mp4'
    }
    
    return 'webm'
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    if (this.mediaRecorder) {
      if (this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop()
      }
      this.mediaRecorder = null
    }
    this.recordedChunks = []
    this.stream = null
  }
}

