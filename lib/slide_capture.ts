/**
 * Slide Capture Utility
 * Captures frames from video feed and sends to slide analysis API
 */

export class SlideCapture {
  private intervalId: number | null = null
  private captureIntervalSeconds: number
  private sessionId: string | null = null
  private onSlideAnalysis?: (result: any) => void
  private frameCount: number = 0

  constructor(
    captureIntervalSeconds: number = 5, // Analyze slides every 5 seconds
    onSlideAnalysis?: (result: any) => void
  ) {
    this.captureIntervalSeconds = captureIntervalSeconds
    this.onSlideAnalysis = onSlideAnalysis
  }

  start(videoElement: HTMLVideoElement, sessionId: string) {
    if (this.intervalId) {
      console.warn('Slide capture already running')
      return
    }

    this.sessionId = sessionId
    console.log(`📊 Starting slide analysis (every ${this.captureIntervalSeconds}s)`)

    // Analyze immediately
    this.captureAndAnalyze(videoElement)

    // Then analyze periodically
    this.intervalId = window.setInterval(() => {
      this.captureAndAnalyze(videoElement)
    }, this.captureIntervalSeconds * 1000)
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
      console.log('📊 Stopped slide analysis')
    }
  }

  private async captureAndAnalyze(videoElement: HTMLVideoElement) {
    try {
      // Create canvas to capture frame
      const canvas = document.createElement('canvas')
      canvas.width = videoElement.videoWidth
      canvas.height = videoElement.videoHeight
      
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        console.error('Failed to get canvas context')
        return
      }

      // Draw current video frame
      ctx.drawImage(videoElement, 0, 0)

      // Convert to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Failed to create blob'))
        }, 'image/jpeg', 0.85)
      })

      // Calculate timestamp
      const timestamp = this.frameCount * this.captureIntervalSeconds
      this.frameCount++

      // Send to API
      const formData = new FormData()
      formData.append('image', blob, 'slide.jpg')
      formData.append('timestamp', timestamp.toString())
      if (this.sessionId) {
        formData.append('session_id', this.sessionId)
      }

      console.log(`📸 Capturing slide at ${timestamp}s...`)

      const response = await fetch('http://localhost:8000/api/slide/analyze-frame', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const result = await response.json()
        console.log(`✅ Slide analyzed (score: ${result.overall_score}/10)`, result)
        
        if (this.onSlideAnalysis) {
          this.onSlideAnalysis(result)
        }
      } else {
        console.error('Slide analysis failed:', response.statusText)
      }
    } catch (error) {
      console.error('Error capturing/analyzing slide:', error)
    }
  }

  getFrameCount(): number {
    return this.frameCount
  }
}

