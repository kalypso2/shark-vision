/**
 * Body Language Analysis Type Definitions
 * Part of Shark Vision presentation grading system
 */

export interface Keypoint {
  x: number
  y: number
  score: number
  name?: string
}

export interface LandmarkFrame {
  timestamp: number // seconds
  keypoints: Keypoint[]
}

export interface BodyLanguageEvent {
  type: 'posture' | 'gesture' | 'gaze' | 'movement'
  subtype: string // e.g., "slouched", "gestured_emphatically", "looked_away"
  start_time: number // seconds
  end_time: number
  confidence: number // 0.0-1.0
  metadata?: {
    direction?: 'left' | 'right'
    intensity?: 'low' | 'medium' | 'high'
    symmetry?: number
    keypoint_visibility?: number
  }
}

export interface SessionMeta {
  session_id: string
  timestamp: string // ISO 8601
  duration_seconds: number
  video_resolution: { width: number; height: number }
  fps_analyzed: number // e.g., 10
  model_version: string // "movenet-lightning-v4"
}

export interface Aggregates {
  posture_score: number // 0-100, based on % time in good posture
  gesture_frequency: number // gestures per minute
  gesture_quality: number // 0-100, symmetric gestures score higher
  eye_contact_proxy: number // 0-100, % time looking forward
  engagement_score: number // 0-100, based on dynamic vs static ratio
  stillness_periods: number // count of 5+ second static periods
}

export interface DebugInfo {
  total_frames_analyzed: number
  keypoint_detection_rate: number // % frames with valid pose
  landmark_snapshots: Array<{
    timestamp: number
    keypoints: Keypoint[]
  }> // sampled every 10 seconds for debugging
}

export interface BodyLanguageAnalysis {
  session_meta: SessionMeta
  timeline: BodyLanguageEvent[]
  aggregates: Aggregates
  debug: DebugInfo
}

// Keypoint indices for MoveNet model
export enum KeypointIndex {
  NOSE = 0,
  LEFT_EYE = 1,
  RIGHT_EYE = 2,
  LEFT_EAR = 3,
  RIGHT_EAR = 4,
  LEFT_SHOULDER = 5,
  RIGHT_SHOULDER = 6,
  LEFT_ELBOW = 7,
  RIGHT_ELBOW = 8,
  LEFT_WRIST = 9,
  RIGHT_WRIST = 10,
  LEFT_HIP = 11,
  RIGHT_HIP = 12,
  LEFT_KNEE = 13,
  RIGHT_KNEE = 14,
  LEFT_ANKLE = 15,
  RIGHT_ANKLE = 16,
}

// Keypoint names mapping
export const KEYPOINT_NAMES = [
  'nose',
  'left_eye',
  'right_eye',
  'left_ear',
  'right_ear',
  'left_shoulder',
  'right_shoulder',
  'left_elbow',
  'right_elbow',
  'left_wrist',
  'right_wrist',
  'left_hip',
  'right_hip',
  'left_knee',
  'right_knee',
  'left_ankle',
  'right_ankle',
]

