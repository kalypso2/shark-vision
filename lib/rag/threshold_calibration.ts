/**
 * Research-Based Threshold Calibration
 * Uses evidence-based benchmarks to tune detection sensitivity
 */

import { getBenchmarks } from './knowledge_base'

/**
 * Calibrated thresholds based on research
 */
export const RESEARCH_CALIBRATED_THRESHOLDS = {
  // GESTURE DETECTION
  // Based on: "Effective speakers use 3-8 gestures per minute"
  // At 10 FPS, one minute = 600 frames
  // Minimum gesture should be detectable at ~1/8th of a minute = 7.5 seconds = 75 frames
  // Hand movement threshold calibrated to detect deliberate gestures, not fidgeting
  gesture: {
    handMovement: 0.03, // Lowered for sensitivity - detects intentional hand gestures
    minDuration: 0.5, // seconds - deliberate gesture minimum
    cooldown: 1.0, // seconds between gesture events
  },

  // ENGAGEMENT (TORSO MOVEMENT)
  // Based on: "Engaging speakers show 8-15% normalized movement per minute"
  // This translates to 0.008-0.015 movement per second
  // At 10 FPS: 0.0008-0.0015 per frame
  // Using 3-second windows: should accumulate 0.024-0.045 total movement
  engagement: {
    // Static: minimal movement, person is mostly still
    staticMovement: 0.006, // torso-only, very subtle shifts
    // Dynamic: clear movement, person is engaged and animated
    dynamicMovement: 0.015, // torso-only, clear shifts and leans
    windowSize: 3, // seconds - analyze movement over 3-second windows
    minDuration: 3, // seconds - minimum for a movement event
  },

  // POSTURE DETECTION
  // Based on: "Professional speakers maintain good posture 75-85% of time"
  // Shoulder alignment: < 15 degrees deviation = good
  // Spine angle: within 10 degrees of vertical = good
  posture: {
    shoulderAlignmentThreshold: 15, // degrees
    spineAngleThreshold: 10, // degrees from vertical
    minGoodPostureDuration: 2, // seconds - how long to maintain before counting as "good"
    maxBadPostureDuration: 5, // seconds - how long before flagging as issue
  },

  // EYE CONTACT / GAZE
  // Based on: "85-95% forward-facing gaze for confident presenters"
  // Head rotation: < 20 degrees left/right = forward-facing
  // Head tilt: < 15 degrees up/down = appropriate level
  gaze: {
    forwardFacingThreshold: 20, // degrees horizontal rotation
    verticalTiltThreshold: 15, // degrees vertical tilt
    offScreenCooldown: 2, // seconds - don't flag rapid glances away
    sustainedLookAwayDuration: 3, // seconds - flag prolonged looking away
  },
}

/**
 * Get calibration explanation for UI/debugging
 */
export function getCalibrationExplanation() {
  const benchmarks = getBenchmarks()
  
  const explanations = {
    gesture: `Gesture threshold calibrated to detect 3-8 gestures/minute (GestureLens research). At 10 FPS processing, this means hand movement exceeding ${RESEARCH_CALIBRATED_THRESHOLDS.gesture.handMovement} normalized units lasting at least ${RESEARCH_CALIBRATED_THRESHOLDS.gesture.minDuration}s.`,
    
    engagement: `Engagement threshold calibrated to detect torso movement matching "engaging speakers" who show 0.008-0.015 normalized movement/second (GestureLens). Analyzed over ${RESEARCH_CALIBRATED_THRESHOLDS.engagement.windowSize}s windows: < ${RESEARCH_CALIBRATED_THRESHOLDS.engagement.staticMovement} = static, > ${RESEARCH_CALIBRATED_THRESHOLDS.engagement.dynamicMovement} = dynamic.`,
    
    posture: `Posture thresholds calibrated for 75-85% good posture target (Toastmasters). Shoulder alignment within ${RESEARCH_CALIBRATED_THRESHOLDS.posture.shoulderAlignmentThreshold}° and spine within ${RESEARCH_CALIBRATED_THRESHOLDS.posture.spineAngleThreshold}° of vertical = good posture.`,
    
    gaze: `Gaze thresholds calibrated for 85-95% forward-facing target (Public Speaking Anxiety research). Head rotation < ${RESEARCH_CALIBRATED_THRESHOLDS.gaze.forwardFacingThreshold}° horizontal and < ${RESEARCH_CALIBRATED_THRESHOLDS.gaze.verticalTiltThreshold}° vertical = forward-facing.`,
  }

  return explanations
}

/**
 * Validate if current thresholds align with research
 */
export function validateThresholds(currentThresholds: {
  gesture: number
  staticMovement: number
  dynamicMovement: number
}) {
  const recommendations = []

  if (currentThresholds.gesture > 0.05) {
    recommendations.push({
      threshold: 'gesture',
      issue: 'Too high - may miss subtle hand movements',
      current: currentThresholds.gesture,
      recommended: RESEARCH_CALIBRATED_THRESHOLDS.gesture.handMovement,
      reasoning: 'Research shows effective speakers use 3-8 gestures/min, requiring sensitive detection',
    })
  }

  if (currentThresholds.staticMovement > 0.008) {
    recommendations.push({
      threshold: 'staticMovement',
      issue: 'Too high - may not detect engaged torso movement',
      current: currentThresholds.staticMovement,
      recommended: RESEARCH_CALIBRATED_THRESHOLDS.engagement.staticMovement,
      reasoning: 'Engaging speakers show 0.008-0.015 movement/second (torso-only)',
    })
  }

  if (currentThresholds.dynamicMovement < 0.012) {
    recommendations.push({
      threshold: 'dynamicMovement',
      issue: 'Too low - may over-detect fidgeting as engagement',
      current: currentThresholds.dynamicMovement,
      recommended: RESEARCH_CALIBRATED_THRESHOLDS.engagement.dynamicMovement,
      reasoning: 'Dynamic movement should be clearly visible, not just fidgeting',
    })
  }

  return {
    isAligned: recommendations.length === 0,
    recommendations,
  }
}

/**
 * Get expected metrics based on research for a given duration
 */
export function getExpectedMetrics(durationSeconds: number) {
  const durationMinutes = durationSeconds / 60

  return {
    gestures: {
      min: Math.round(3 * durationMinutes), // 3/min minimum
      optimal: Math.round(5.5 * durationMinutes), // 5.5/min average
      max: Math.round(8 * durationMinutes), // 8/min maximum
      source: 'GestureLens research',
    },
    
    engagementMovement: {
      minPerSecond: 0.008,
      maxPerSecond: 0.015,
      expectedTotal: 0.011 * durationSeconds, // Average: 0.011/second
      source: 'GestureLens temporal analysis',
    },
    
    forwardGazePercentage: {
      min: 85,
      optimal: 90,
      max: 95,
      source: 'Public Speaking Anxiety research',
    },
    
    goodPosturePercentage: {
      min: 75,
      optimal: 80,
      max: 85,
      source: 'Toastmasters professional standards',
    },
  }
}

