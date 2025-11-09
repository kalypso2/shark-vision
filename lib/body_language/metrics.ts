/**
 * Metrics Calculation Module
 * Contains functions to calculate body language metrics from landmark data
 * Thresholds calibrated based on peer-reviewed research - see lib/rag/threshold_calibration.ts
 */

import type { LandmarkFrame, Keypoint, BodyLanguageEvent, Aggregates } from './types'

// Detection thresholds
export const THRESHOLDS = {
  GOOD_POSTURE: 0.15, // ~8.5 degrees
  SLOUCH: 0.35, // ~20 degrees
  GESTURE: 0.03, // 3% of frame height (more sensitive gesture detection)
  FIDGET: 0.02, // 2% of frame height
  LOOKING_AWAY: 0.25, // 25% of shoulder width
  STATIC_MOVEMENT: 0.006, // torso-centric small movement threshold
  DYNAMIC_MOVEMENT: 0.015, // torso-centric engaged movement threshold
  MIN_KEYPOINT_SCORE: 0.3, // minimum confidence for keypoint
}

/**
 * Calculate Euclidean distance between two keypoints
 */
export function calculateDistance(p1: Keypoint, p2: Keypoint): number {
  const dx = p1.x - p2.x
  const dy = p1.y - p2.y
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Find a keypoint by name in the keypoints array
 */
export function findKeypoint(keypoints: Keypoint[], name: string): Keypoint | null {
  const kp = keypoints.find(k => k.name === name)
  return kp && kp.score >= THRESHOLDS.MIN_KEYPOINT_SCORE ? kp : null
}

/**
 * Calculate posture angle from vertical
 * Returns angle in radians (positive = leaning forward/slouching)
 */
export function calculatePostureAngle(keypoints: Keypoint[]): number | null {
  const nose = findKeypoint(keypoints, 'nose')
  const leftShoulder = findKeypoint(keypoints, 'left_shoulder')
  const rightShoulder = findKeypoint(keypoints, 'right_shoulder')

  if (!nose || !leftShoulder || !rightShoulder) {
    return null
  }

  const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2
  const noseY = nose.y

  // Calculate angle from vertical
  // Positive angle means nose is below shoulders (slouching)
  const angle = Math.atan2(noseY - shoulderMidY, 0)
  
  return Math.abs(angle)
}

/**
 * Calculate wrist movement between frames
 * Returns normalized movement (0-1 scale based on frame dimensions)
 */
export function calculateWristMovement(
  currentKeypoints: Keypoint[],
  previousKeypoints: Keypoint[],
  frameHeight: number
): { left: number; right: number; avg: number } | null {
  const currLeftWrist = findKeypoint(currentKeypoints, 'left_wrist')
  const currRightWrist = findKeypoint(currentKeypoints, 'right_wrist')
  const prevLeftWrist = findKeypoint(previousKeypoints, 'left_wrist')
  const prevRightWrist = findKeypoint(previousKeypoints, 'right_wrist')

  if (!currLeftWrist || !currRightWrist || !prevLeftWrist || !prevRightWrist) {
    return null
  }

  const leftDelta = calculateDistance(currLeftWrist, prevLeftWrist) / frameHeight
  const rightDelta = calculateDistance(currRightWrist, prevRightWrist) / frameHeight
  const avg = (leftDelta + rightDelta) / 2

  return { left: leftDelta, right: rightDelta, avg }
}

/**
 * Calculate gesture symmetry
 * Returns 0-1 where 1 is perfectly symmetric
 */
export function calculateGestureSymmetry(leftMovement: number, rightMovement: number): number {
  if (leftMovement === 0 && rightMovement === 0) {
    return 1
  }

  const maxMovement = Math.max(leftMovement, rightMovement)
  const minMovement = Math.min(leftMovement, rightMovement)
  
  return minMovement / maxMovement
}

/**
 * Calculate head rotation (gaze proxy)
 * Returns offset ratio and direction
 */
export function calculateGazeDirection(keypoints: Keypoint[]): {
  offset: number
  direction: 'left' | 'right' | 'center'
} | null {
  const nose = findKeypoint(keypoints, 'nose')
  const leftShoulder = findKeypoint(keypoints, 'left_shoulder')
  const rightShoulder = findKeypoint(keypoints, 'right_shoulder')

  if (!nose || !leftShoulder || !rightShoulder) {
    return null
  }

  const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2
  const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x)
  const noseToCenterOffset = nose.x - shoulderMidX
  const offsetRatio = Math.abs(noseToCenterOffset) / shoulderWidth

  let direction: 'left' | 'right' | 'center' = 'center'
  if (offsetRatio > THRESHOLDS.LOOKING_AWAY) {
    direction = noseToCenterOffset < 0 ? 'left' : 'right'
  }

  return { offset: offsetRatio, direction }
}

/**
 * Calculate overall body movement
 * Returns average movement of all upper body keypoints
 */
export function calculateOverallMovement(
  currentKeypoints: Keypoint[],
  previousKeypoints: Keypoint[],
  frameHeight: number
): number | null {
  // Engagement is torso-centric: exclude wrists and elbows to avoid overlap with gesture quality
  const keypointNames = [
    'nose',
    'left_shoulder',
    'right_shoulder',
    'left_hip',
    'right_hip',
  ]

  let totalMovement = 0
  let validCount = 0

  for (const name of keypointNames) {
    const curr = findKeypoint(currentKeypoints, name)
    const prev = findKeypoint(previousKeypoints, name)

    if (curr && prev) {
      totalMovement += calculateDistance(curr, prev) / frameHeight
      validCount++
    }
  }

  return validCount > 0 ? totalMovement / validCount : null
}

/**
 * Calculate aggregate scores from events and landmarks
 * Now includes confidence weighting for more reliable scores
 */
export function calculateAggregates(
  landmarks: LandmarkFrame[],
  events: BodyLanguageEvent[]
): Aggregates {
  if (landmarks.length === 0) {
    return {
      posture_score: 0,
      gesture_frequency: 0,
      gesture_quality: 0,
      eye_contact_proxy: 0,
      engagement_score: 0,
      stillness_periods: 0,
    }
  }

  const totalDuration = landmarks[landmarks.length - 1].timestamp - landmarks[0].timestamp

  // Calculate confidence-weighted posture score
  const slouchEvents = events.filter(e => e.subtype === 'slouched')
  let weightedSlouchDuration = 0
  slouchEvents.forEach(e => {
    const duration = e.end_time - e.start_time
    const confidence = e.confidence || 0.5
    const visibility = e.metadata?.keypoint_visibility || 0.5
    // Weight by both event confidence and keypoint visibility
    weightedSlouchDuration += duration * confidence * visibility
  })
  const posture_score = Math.max(0, 100 - (weightedSlouchDuration / totalDuration) * 100)

  // Calculate gesture metrics
  const gestureEvents = events.filter(e => e.type === 'gesture' && e.subtype !== 'fidgeting')
  const gesture_frequency = (gestureEvents.length / totalDuration) * 60 // per minute
  
  console.log('Total gesture events (excluding fidgeting):', gestureEvents.length)
  
  const symmetricGestures = gestureEvents.filter(e => 
    e.metadata?.symmetry && e.metadata.symmetry > 0.7
  )
  
  // Calculate gesture quality
  // If no gestures, return 0 (not 50) to differentiate from engagement
  const gesture_quality = gestureEvents.length > 0
    ? (symmetricGestures.length / gestureEvents.length) * 100
    : 0

  // Calculate confidence-weighted eye contact proxy
  const lookingAwayEvents = events.filter(e => e.subtype === 'looked_away')
  let weightedLookingAwayDuration = 0
  lookingAwayEvents.forEach(e => {
    const duration = e.end_time - e.start_time
    const confidence = e.confidence || 0.5
    weightedLookingAwayDuration += duration * confidence
  })
  const eye_contact_proxy = Math.max(0, 100 - (weightedLookingAwayDuration / totalDuration) * 100)

  // Calculate engagement score based on dynamic vs static movement
  const staticEvents = events.filter(e => e.subtype === 'static_period')
  const dynamicEvents = events.filter(e => e.subtype === 'dynamic_period')
  
  console.log('Static events:', staticEvents.length, 'Dynamic events:', dynamicEvents.length)
  
  const staticDuration = staticEvents.reduce((sum, e) => sum + (e.end_time - e.start_time), 0)
  const dynamicDuration = dynamicEvents.reduce((sum, e) => sum + (e.end_time - e.start_time), 0)
  
  console.log('Static duration:', staticDuration, 'Dynamic duration:', dynamicDuration)
  
  // Base engagement on ratio of dynamic to total analyzed time
  // If no movement events detected, return 0 to indicate lack of data
  let engagement_score = 0
  if (staticDuration + dynamicDuration > 0) {
    engagement_score = (dynamicDuration / (staticDuration + dynamicDuration)) * 100
  } else {
    // Fallback: if no movement events at all, assume moderate engagement
    engagement_score = 60
  }

  const stillness_periods = staticEvents.length

  return {
    posture_score: Math.round(posture_score),
    gesture_frequency: Math.round(gesture_frequency * 10) / 10,
    gesture_quality: Math.round(gesture_quality),
    eye_contact_proxy: Math.round(eye_contact_proxy),
    engagement_score: Math.round(engagement_score),
    stillness_periods,
  }
}

/**
 * Get frame dimensions from first valid frame
 */
export function getFrameDimensions(landmarks: LandmarkFrame[]): { width: number; height: number } {
  for (const frame of landmarks) {
    const leftShoulder = findKeypoint(frame.keypoints, 'left_shoulder')
    const rightShoulder = findKeypoint(frame.keypoints, 'right_shoulder')
    const nose = findKeypoint(frame.keypoints, 'nose')
    const leftHip = findKeypoint(frame.keypoints, 'left_hip')

    if (leftShoulder && rightShoulder && nose && leftHip) {
      // Estimate frame dimensions based on body proportions
      const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x)
      const bodyHeight = Math.abs(nose.y - leftHip.y)
      
      return {
        width: shoulderWidth * 3, // rough estimate
        height: bodyHeight * 2.5, // rough estimate
      }
    }
  }

  // Default fallback
  return { width: 640, height: 480 }
}

