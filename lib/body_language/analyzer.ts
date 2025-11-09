/**
 * Body Language Analyzer
 * Main orchestrator class for body language analysis
 */

import { PoseDetector } from './pose_detector'
import { EventDetector } from './event_detector'
import { KeypointSmoother } from './smoothing'
import { calculateAggregates, getFrameDimensions } from './metrics'
import type {
  BodyLanguageAnalysis,
  LandmarkFrame,
  SessionMeta,
  Keypoint,
} from './types'

export class BodyLanguageAnalyzer {
  private poseDetector: PoseDetector
  private eventDetector: EventDetector
  private smoother: KeypointSmoother
  private landmarkBuffer: LandmarkFrame[] = []
  private startTime: number = 0
  private isInitialized = false

  // Frame sampling configuration
  private readonly TARGET_FPS = 10 // Analyze 10 frames per second
  private lastProcessedTime = 0

  constructor() {
    this.poseDetector = new PoseDetector()
    this.eventDetector = new EventDetector()
    this.smoother = new KeypointSmoother()
  }

  /**
   * Initialize the analyzer (load models)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    console.log('Initializing Body Language Analyzer...')
    await this.poseDetector.loadModel()
    this.isInitialized = true
    console.log('Body Language Analyzer ready')
  }

  /**
   * Start a new analysis session
   */
  start(): void {
    this.landmarkBuffer = []
    this.startTime = Date.now()
    this.lastProcessedTime = 0
    console.log('Analysis session started')
  }

  /**
   * Process a video frame
   * Returns true if frame was processed, false if skipped (FPS throttling)
   */
  async processFrame(
    videoElement: HTMLVideoElement,
    currentTime: number
  ): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('Analyzer not initialized. Call initialize() first.')
    }

    // Throttle to target FPS
    const frameInterval = 1000 / this.TARGET_FPS
    if (currentTime - this.lastProcessedTime < frameInterval) {
      return false
    }

    try {
      const pose = await this.poseDetector.detectPose(videoElement)
      const timestamp = (Date.now() - this.startTime) / 1000 // Convert to seconds

      // Apply temporal smoothing to reduce jitter
      const smoothedKeypoints = this.smoother.smooth(pose.keypoints)

      this.landmarkBuffer.push({
        timestamp,
        keypoints: smoothedKeypoints,
      })

      this.lastProcessedTime = currentTime
      return true
    } catch (error) {
      console.error('Error processing frame:', error)
      return false
    }
  }

  /**
   * Generate final analysis from collected data
   */
  generateAnalysis(
    sessionId: string,
    videoResolution: { width: number; height: number }
  ): BodyLanguageAnalysis {
    console.log('Generating analysis from', this.landmarkBuffer.length, 'frames')

    if (this.landmarkBuffer.length === 0) {
      return this.createEmptyAnalysis(sessionId, videoResolution)
    }

    // Detect events
    const events = this.eventDetector.detectEvents(this.landmarkBuffer)
    console.log('Detected', events.length, 'body language events')
    
    // Debug: log event breakdown
    const eventsByType = events.reduce((acc, e) => {
      acc[e.type] = (acc[e.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    console.log('Event breakdown:', eventsByType)
    console.log('Gesture events:', events.filter(e => e.type === 'gesture').length)
    console.log('Movement events:', events.filter(e => e.type === 'movement').length)

    // Calculate aggregates
    const aggregates = calculateAggregates(this.landmarkBuffer, events)

    // Calculate duration
    const duration =
      this.landmarkBuffer[this.landmarkBuffer.length - 1].timestamp -
      this.landmarkBuffer[0].timestamp

    // Create session metadata
    const sessionMeta: SessionMeta = {
      session_id: sessionId,
      timestamp: new Date().toISOString(),
      duration_seconds: Math.round(duration * 10) / 10,
      video_resolution: videoResolution,
      fps_analyzed: this.TARGET_FPS,
      model_version: 'movenet-lightning-v4',
    }

    // Create debug snapshots (every 10 seconds)
    const landmarkSnapshots = this.createDebugSnapshots()

    // Calculate detection rate
    const framesWithPose = this.landmarkBuffer.filter(
      f => f.keypoints.length > 0
    ).length
    const detectionRate = framesWithPose / this.landmarkBuffer.length

    return {
      session_meta: sessionMeta,
      timeline: events,
      aggregates,
      debug: {
        total_frames_analyzed: this.landmarkBuffer.length,
        keypoint_detection_rate: Math.round(detectionRate * 100),
        landmark_snapshots: landmarkSnapshots,
      },
    }
  }

  /**
   * Create debug snapshots (sampled every 10 seconds)
   */
  private createDebugSnapshots(): Array<{
    timestamp: number
    keypoints: Keypoint[]
  }> {
    const snapshots: Array<{ timestamp: number; keypoints: Keypoint[] }> = []
    const snapshotInterval = 10 // seconds

    let lastSnapshotTime = 0

    for (const frame of this.landmarkBuffer) {
      if (frame.timestamp - lastSnapshotTime >= snapshotInterval) {
        snapshots.push({
          timestamp: frame.timestamp,
          keypoints: frame.keypoints,
        })
        lastSnapshotTime = frame.timestamp
      }
    }

    return snapshots
  }

  /**
   * Create empty analysis for edge cases
   */
  private createEmptyAnalysis(
    sessionId: string,
    videoResolution: { width: number; height: number }
  ): BodyLanguageAnalysis {
    return {
      session_meta: {
        session_id: sessionId,
        timestamp: new Date().toISOString(),
        duration_seconds: 0,
        video_resolution: videoResolution,
        fps_analyzed: this.TARGET_FPS,
        model_version: 'movenet-lightning-v4',
      },
      timeline: [],
      aggregates: {
        posture_score: 0,
        gesture_frequency: 0,
        gesture_quality: 0,
        eye_contact_proxy: 0,
        engagement_score: 0,
        stillness_periods: 0,
      },
      debug: {
        total_frames_analyzed: 0,
        keypoint_detection_rate: 0,
        landmark_snapshots: [],
      },
    }
  }

  /**
   * Reset the analyzer
   */
  reset(): void {
    this.landmarkBuffer = []
    this.startTime = 0
    this.lastProcessedTime = 0
    this.smoother.reset()
  }

  /**
   * Get current buffer size (for debugging)
   */
  getBufferSize(): number {
    return this.landmarkBuffer.length
  }

  /**
   * Check if analyzer is ready
   */
  isReady(): boolean {
    return this.isInitialized && this.poseDetector.isReady()
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.poseDetector.dispose()
    this.landmarkBuffer = []
    this.isInitialized = false
  }
}

