/**
 * Event Detector Module
 * Rule-based detection of body language events from landmark data
 * Detection logic informed by research - see lib/rag/threshold_calibration.ts for benchmarks
 */

import type { LandmarkFrame, BodyLanguageEvent } from './types'
import {
  THRESHOLDS,
  calculatePostureAngle,
  calculateWristMovement,
  calculateGestureSymmetry,
  calculateGazeDirection,
  calculateOverallMovement,
  getFrameDimensions,
} from './metrics'

interface MovementWindow {
  timestamp: number
  movement: number
}

export class EventDetector {
  private movementWindow: MovementWindow[] = []
  private readonly WINDOW_SIZE = 3 // seconds for static/dynamic detection (reduced for responsiveness)
  private readonly SLOUCH_DURATION = 2 // seconds before triggering slouch event
  private readonly FIDGET_WINDOW = 10 // seconds to count fidget frequency
  private readonly FIDGET_COUNT_THRESHOLD = 5 // movements in window

  /**
   * Detect all body language events from landmark data
   */
  detectEvents(landmarks: LandmarkFrame[]): BodyLanguageEvent[] {
    if (landmarks.length < 2) {
      return []
    }

    const events: BodyLanguageEvent[] = []
    const frameDimensions = getFrameDimensions(landmarks)
    const frameHeight = frameDimensions.height

    // Track state for multi-frame events
    let slouchStartTime: number | null = null
    let lookingAwayStartTime: number | null = null
    let lastLookDirection: 'left' | 'right' | 'center' = 'center'
    let fidgetMovements: number[] = []

    // Analyze frame by frame
    for (let i = 1; i < landmarks.length; i++) {
      const current = landmarks[i]
      const previous = landmarks[i - 1]

      // Skip if no valid keypoints
      if (current.keypoints.length === 0 || previous.keypoints.length === 0) {
        continue
      }

      // Detect posture events
      const postureEvent = this.detectPostureEvent(
        current,
        previous,
        slouchStartTime
      )
      if (postureEvent.event) {
        events.push(postureEvent.event)
      }
      slouchStartTime = postureEvent.slouchStartTime

      // Detect gesture events
      const gestureEvent = this.detectGestureEvent(
        current,
        previous,
        frameHeight
      )
      if (gestureEvent) {
        events.push(gestureEvent)
      }

      // Track fidgeting
      const wristMovement = calculateWristMovement(
        current.keypoints,
        previous.keypoints,
        frameHeight
      )
      if (wristMovement) {
        fidgetMovements.push(current.timestamp)
        // Clean old movements outside window
        fidgetMovements = fidgetMovements.filter(
          t => current.timestamp - t <= this.FIDGET_WINDOW
        )

        const fidgetEvent = this.detectFidgetEvent(
          current,
          wristMovement,
          fidgetMovements.length
        )
        if (fidgetEvent) {
          events.push(fidgetEvent)
        }
      }

      // Detect gaze events
      const gazeEvent = this.detectGazeEvent(
        current,
        previous,
        lookingAwayStartTime,
        lastLookDirection
      )
      if (gazeEvent.event) {
        events.push(gazeEvent.event)
      }
      lookingAwayStartTime = gazeEvent.lookingAwayStartTime
      lastLookDirection = gazeEvent.direction

      // Track movement for engagement
      const movement = calculateOverallMovement(
        current.keypoints,
        previous.keypoints,
        frameHeight
      )
      if (movement !== null) {
        this.movementWindow.push({ timestamp: current.timestamp, movement })
        // Clean old entries outside the window
        this.movementWindow = this.movementWindow.filter(
          w => current.timestamp - w.timestamp <= this.WINDOW_SIZE
        )
        
        // Attempt detection; method enforces WINDOW_SIZE duration
        const movementEvent = this.detectMovementEvent(current)
        if (movementEvent) {
          events.push(movementEvent)
        }
      }
    }

    // Merge consecutive events of the same type
    return this.mergeConsecutiveEvents(events)
  }

  /**
   * Detect posture events (good posture vs slouching)
   */
  private detectPostureEvent(
    current: LandmarkFrame,
    previous: LandmarkFrame,
    slouchStartTime: number | null
  ): { event: BodyLanguageEvent | null; slouchStartTime: number | null } {
    const angle = calculatePostureAngle(current.keypoints)

    if (angle === null) {
      return { event: null, slouchStartTime: null }
    }

    // Check for slouching
    if (angle > THRESHOLDS.SLOUCH) {
      if (slouchStartTime === null) {
        slouchStartTime = current.timestamp
      } else if (current.timestamp - slouchStartTime >= this.SLOUCH_DURATION) {
        // Slouch detected for sufficient duration
        const event: BodyLanguageEvent = {
          type: 'posture',
          subtype: 'slouched',
          start_time: slouchStartTime,
          end_time: current.timestamp,
          confidence: 0.85,
          metadata: {
            keypoint_visibility: this.calculateKeypointVisibility(current.keypoints),
          },
        }
        return { event, slouchStartTime: current.timestamp }
      }
    } else {
      // Good posture - reset slouch tracking
      if (slouchStartTime !== null) {
        slouchStartTime = null
      }

      if (angle < THRESHOLDS.GOOD_POSTURE) {
        const event: BodyLanguageEvent = {
          type: 'posture',
          subtype: 'good_posture',
          start_time: current.timestamp,
          end_time: current.timestamp,
          confidence: 0.9,
        }
        return { event, slouchStartTime: null }
      }
    }

    return { event: null, slouchStartTime }
  }

  /**
   * Detect gesture events
   */
  private detectGestureEvent(
    current: LandmarkFrame,
    previous: LandmarkFrame,
    frameHeight: number
  ): BodyLanguageEvent | null {
    const wristMovement = calculateWristMovement(
      current.keypoints,
      previous.keypoints,
      frameHeight
    )

    if (!wristMovement) {
      return null
    }

    const { left, right, avg } = wristMovement
    const maxHand = Math.max(left, right)

    // Detect emphatic gesturing
    if (avg > THRESHOLDS.GESTURE) {
      const symmetry = calculateGestureSymmetry(left, right)
      let intensity: 'low' | 'medium' | 'high' = 'low'
      
      if (avg > 0.12) {
        intensity = 'high'
      } else if (avg > THRESHOLDS.GESTURE) {
        intensity = 'medium'
      }

      const subtype = symmetry > 0.7 ? 'symmetric_gesture' : 'asymmetric_gesture'

      return {
        type: 'gesture',
        subtype,
        start_time: current.timestamp,
        end_time: current.timestamp,
        confidence: 0.8,
        metadata: {
          intensity,
          symmetry,
        },
      }
    }

    // One-handed notable gesture (avoid classifying as fidget if movement is substantial on one side)
    if (maxHand > THRESHOLDS.GESTURE && avg <= THRESHOLDS.GESTURE) {
      return {
        type: 'gesture',
        subtype: 'one_hand_gesture',
        start_time: current.timestamp,
        end_time: current.timestamp,
        confidence: 0.75,
        metadata: {
          intensity: maxHand > 0.08 ? 'high' : 'medium',
          symmetry: calculateGestureSymmetry(left, right),
        },
      }
    }

    return null
  }

  /**
   * Detect fidgeting behavior
   */
  private detectFidgetEvent(
    current: LandmarkFrame,
    wristMovement: { left: number; right: number; avg: number },
    movementCount: number
  ): BodyLanguageEvent | null {
    const { avg, left, right } = wristMovement

    // Small movements but frequent
    if (
      avg < THRESHOLDS.FIDGET * 3 &&
      avg > THRESHOLDS.FIDGET &&
      movementCount >= this.FIDGET_COUNT_THRESHOLD
    ) {
      const symmetry = calculateGestureSymmetry(left, right)
      
      // Fidgeting is typically asymmetric
      if (symmetry < 0.5) {
        return {
          type: 'gesture',
          subtype: 'fidgeting',
          start_time: current.timestamp,
          end_time: current.timestamp,
          confidence: 0.7,
          metadata: {
            intensity: 'low',
          },
        }
      }
    }

    return null
  }

  /**
   * Detect gaze direction events (looking away from screen)
   */
  private detectGazeEvent(
    current: LandmarkFrame,
    previous: LandmarkFrame,
    lookingAwayStartTime: number | null,
    lastDirection: 'left' | 'right' | 'center'
  ): {
    event: BodyLanguageEvent | null
    lookingAwayStartTime: number | null
    direction: 'left' | 'right' | 'center'
  } {
    const gaze = calculateGazeDirection(current.keypoints)

    if (!gaze) {
      return {
        event: null,
        lookingAwayStartTime: null,
        direction: lastDirection,
      }
    }

    const { direction } = gaze

    // Looking away
    if (direction !== 'center') {
      if (lookingAwayStartTime === null) {
        lookingAwayStartTime = current.timestamp
      } else if (current.timestamp - lookingAwayStartTime >= 1.0) {
        // Looking away for 1+ second
        const event: BodyLanguageEvent = {
          type: 'gaze',
          subtype: 'looked_away',
          start_time: lookingAwayStartTime,
          end_time: current.timestamp,
          confidence: 0.75,
          metadata: {
            direction,
          },
        }
        return {
          event,
          lookingAwayStartTime: current.timestamp,
          direction,
        }
      }
    } else {
      // Looking at screen
      lookingAwayStartTime = null
    }

    return {
      event: null,
      lookingAwayStartTime,
      direction,
    }
  }

  /**
   * Detect static vs dynamic movement periods
   */
  private detectMovementEvent(current: LandmarkFrame): BodyLanguageEvent | null {
    const avgMovement =
      this.movementWindow.reduce((sum, w) => sum + w.movement, 0) /
      this.movementWindow.length

    // Static period (too still) - only emit if sustained
    if (avgMovement < THRESHOLDS.STATIC_MOVEMENT) {
      // Check if this is a new static period or continuation
      const windowStart = this.movementWindow[0].timestamp
      if (current.timestamp - windowStart >= this.WINDOW_SIZE) {
        return {
          type: 'movement',
          subtype: 'static_period',
          start_time: windowStart,
          end_time: current.timestamp,
          confidence: 0.8,
        }
      }
    }

    // Dynamic period (engaged)
    if (avgMovement > THRESHOLDS.DYNAMIC_MOVEMENT) {
      const windowStart = this.movementWindow[0].timestamp
      if (current.timestamp - windowStart >= this.WINDOW_SIZE) {
        return {
          type: 'movement',
          subtype: 'dynamic_period',
          start_time: windowStart,
          end_time: current.timestamp,
          confidence: 0.85,
        }
      }
    }

    return null
  }

  /**
   * Merge consecutive events of the same type
   */
  private mergeConsecutiveEvents(events: BodyLanguageEvent[]): BodyLanguageEvent[] {
    if (events.length === 0) {
      return []
    }

    const merged: BodyLanguageEvent[] = []
    let current = { ...events[0] }

    for (let i = 1; i < events.length; i++) {
      const next = events[i]

      // Check if events should be merged
      if (
        current.type === next.type &&
        current.subtype === next.subtype &&
        next.start_time - current.end_time <= 1.0 // within 1 second
      ) {
        // Merge events
        current.end_time = next.end_time
        current.confidence = Math.max(current.confidence, next.confidence)
      } else {
        // Push current and start new
        merged.push(current)
        current = { ...next }
      }
    }

    // Push last event
    merged.push(current)

    return merged
  }

  /**
   * Calculate average keypoint visibility score
   */
  private calculateKeypointVisibility(keypoints: any[]): number {
    if (keypoints.length === 0) {
      return 0
    }

    const totalScore = keypoints.reduce((sum, kp) => sum + (kp.score || 0), 0)
    return totalScore / keypoints.length
  }
}

