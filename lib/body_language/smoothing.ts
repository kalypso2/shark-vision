/**
 * Keypoint Smoothing Module
 * Reduces jitter and noise in pose detection through temporal filtering
 */

import type { Keypoint } from './types'

export class KeypointSmoother {
  private history: Map<string, Keypoint[]> = new Map()
  private readonly SMOOTHING_FACTOR = 0.3 // Higher = less smoothing (more responsive)
  private readonly HISTORY_SIZE = 5 // Frames to keep in history

  /**
   * Apply exponential moving average smoothing to keypoints
   * Reduces frame-to-frame jitter while maintaining responsiveness
   */
  smooth(keypoints: Keypoint[]): Keypoint[] {
    return keypoints.map((kp, index) => {
      const key = kp.name || `keypoint_${index}`
      const history = this.history.get(key) || []

      // Apply EMA smoothing if we have previous frames
      if (history.length > 0) {
        const prev = history[history.length - 1]
        
        // Only smooth high-confidence keypoints
        if (kp.score > 0.3 && prev.score > 0.3) {
          const smoothed: Keypoint = {
            x: prev.x * (1 - this.SMOOTHING_FACTOR) + kp.x * this.SMOOTHING_FACTOR,
            y: prev.y * (1 - this.SMOOTHING_FACTOR) + kp.y * this.SMOOTHING_FACTOR,
            score: kp.score, // Don't smooth confidence
            name: kp.name,
          }
          
          // Update history
          history.push(smoothed)
          if (history.length > this.HISTORY_SIZE) {
            history.shift()
          }
          this.history.set(key, history)
          
          return smoothed
        }
      }

      // No smoothing for first frame or low-confidence keypoints
      history.push({ ...kp })
      if (history.length > this.HISTORY_SIZE) {
        history.shift()
      }
      this.history.set(key, history)

      return kp
    })
  }

  /**
   * Reset smoothing history (call between sessions)
   */
  reset(): void {
    this.history.clear()
  }

  /**
   * Get smoothing statistics for debugging
   */
  getStats(): { keypointsTracked: number; avgHistorySize: number } {
    let totalHistory = 0
    this.history.forEach(hist => {
      totalHistory += hist.length
    })

    return {
      keypointsTracked: this.history.size,
      avgHistorySize: this.history.size > 0 ? totalHistory / this.history.size : 0,
    }
  }
}

