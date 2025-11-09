"""
Body Language Analyzer
Enhanced metrics using 543 MediaPipe Holistic landmarks
"""

from typing import Dict, List, Optional
import numpy as np
from datetime import datetime
import logging
from .debug_logger import AnalysisDebugLogger

logger = logging.getLogger(__name__)

class BodyLanguageAnalyzer:
    """
    Analyzes body language from MediaPipe Holistic landmarks
    
    Capabilities (vs 17-keypoint JavaScript version):
    - More precise posture detection (33 vs 17 body points)
    - Facial expressions (468 face landmarks)
    - Detailed hand gestures (42 hand landmarks vs 4 wrist points)
    - Better eye gaze tracking (actual eye landmarks)
    """
    
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.timeline = []
        self.metrics_history = []
        self.start_time = datetime.now()
        
        # Debug logger
        self.debug_logger = AnalysisDebugLogger(session_id)
        
        # Tracking state
        self.previous_landmarks = None
        self.movement_window = []
        self.gesture_cooldown = 0
        self.frame_number = 0
        
    def calculate_metrics(self, landmarks: Dict, timestamp: float) -> Dict:
        """
        Calculate body language metrics from 543 landmarks
        
        Returns enhanced metrics including:
        - Posture quality (enhanced with 33 points)
        - Facial expressions (NEW: smile, eyebrow position, etc.)
        - Hand gesture symmetry (enhanced with finger tracking)
        - Eye gaze direction (NEW: actual eye tracking)
        - Overall movement and engagement
        """
        metrics = {}
        
        # Extract landmark groups
        pose = landmarks.get('pose', [])
        face = landmarks.get('face', [])
        left_hand = landmarks.get('left_hand', [])
        right_hand = landmarks.get('right_hand', [])
        
        if not pose:
            return metrics
        
        # 1. ENHANCED POSTURE (using 33 pose landmarks)
        metrics['posture'] = self._calculate_posture_enhanced(pose)
        
        # 2. FACIAL EXPRESSIONS (NEW - using 468 face landmarks)
        if face:
            metrics['facial'] = self._calculate_facial_expressions(face)
        
        # 3. ENHANCED HAND GESTURES (using finger tracking)
        metrics['gesture'] = self._calculate_gestures_enhanced(
            pose, left_hand, right_hand
        )
        
        # 4. PRECISE EYE GAZE (NEW - using actual eye landmarks)
        if face:
            metrics['gaze'] = self._calculate_gaze_precise(pose, face)
        else:
            metrics['gaze'] = self._calculate_gaze_proxy(pose)
        
        # 5. OVERALL MOVEMENT (torso-centric engagement)
        metrics['movement'] = self._calculate_movement(pose, timestamp)
        
        # Store for temporal analysis
        self.metrics_history.append({
            'timestamp': timestamp,
            'metrics': metrics
        })
        
        # Log to debug logger
        self.frame_number += 1
        self.debug_logger.log_frame(timestamp, self.frame_number, metrics)
        
        self.previous_landmarks = landmarks
        
        return metrics
    
    def _calculate_posture_enhanced(self, pose: List[Dict]) -> Dict:
        """
        Enhanced posture calculation with 33 pose landmarks
        FIXED: Now properly rewards good posture (90-100) and penalizes slouching
        """
        # Key landmarks
        nose = pose[0]
        left_shoulder = pose[11]
        right_shoulder = pose[12]
        left_hip = pose[23]
        right_hip = pose[24]
        
        # Shoulder alignment (horizontal level) - VERY LENIENT
        shoulder_diff = abs(left_shoulder['y'] - right_shoulder['y'])
        shoulder_alignment = max(0, 1.0 - (shoulder_diff / 0.10))  # Score drops only if VERY uneven
        
        # Spine straightness - check if shoulders are above hips (not leaning)
        shoulder_mid_y = (left_shoulder['y'] + right_shoulder['y']) / 2
        hip_mid_y = (left_hip['y'] + right_hip['y']) / 2
        nose_y = nose['y']
        
        # Forward lean detection (slouching = nose too low relative to shoulders)
        # In webcam coords, lower Y = higher on screen
        ideal_head_shoulder_diff = 0.15  # Ideal distance between nose and shoulders
        actual_diff = shoulder_mid_y - nose_y  # Positive = head above shoulders (good)
        
        if actual_diff >= ideal_head_shoulder_diff:
            # Head is properly above shoulders
            spine_quality = 1.0
        else:
            # Slouching or leaning forward
            spine_quality = max(0, actual_diff / ideal_head_shoulder_diff)
        
        # Overall posture score - BOTH matter equally now
        posture_score = (shoulder_alignment * 0.5 + spine_quality * 0.5) * 100
        
        return {
            'score': posture_score,
            'shoulder_alignment': shoulder_alignment,
            'spine_quality': spine_quality,
            'is_good': posture_score >= 70
        }
    
    def _calculate_facial_expressions(self, face: List[Dict]) -> Dict:
        """
        NEW: Analyze facial expressions using 468 face landmarks
        
        Detects:
        - Smile vs neutral vs frown
        - Eyebrow position (raised, neutral, furrowed)
        - Eye openness
        - Mouth openness (speaking indicator)
        """
        # Mouth corners (61, 291) and center top/bottom (13, 14)
        mouth_left = face[61] if len(face) > 61 else None
        mouth_right = face[291] if len(face) > 291 else None
        mouth_top = face[13] if len(face) > 13 else None
        mouth_bottom = face[14] if len(face) > 14 else None
        
        # Eyebrows (70-left, 300-right)
        left_eyebrow = face[70] if len(face) > 70 else None
        right_eyebrow = face[300] if len(face) > 300 else None
        
        # Eyes (159-left, 386-right)
        left_eye = face[159] if len(face) > 159 else None
        right_eye = face[386] if len(face) > 386 else None
        
        expressions = {}
        
        # Smile detection (mouth corners elevated)
        # FIXED: When smiling, corners go UP (lower Y value in screen coords)
        if mouth_left and mouth_right and mouth_top:
            mouth_center_y = mouth_top['y']
            mouth_corners_y = (mouth_left['y'] + mouth_right['y']) / 2
            # Smiling = corners LOWER in Y (higher on screen) than center
            smile_amount = max(0, (mouth_corners_y - mouth_center_y) * 50)  # Was 10, now 50 for better range
            expressions['smile'] = min(smile_amount, 1.0)
        
        # Eyebrow raise detection
        # FIXED: Raised eyebrows = eyebrows HIGHER (lower Y) than eyes
        if left_eyebrow and right_eyebrow and left_eye and right_eye:
            eyebrow_y = (left_eyebrow['y'] + right_eyebrow['y']) / 2
            eye_y = (left_eye['y'] + right_eye['y']) / 2
            # Neutral: ~0.02-0.03 distance, Raised: >0.04
            distance = eye_y - eyebrow_y
            # Scale to 0-1 range (0.02 = 0, 0.06 = 1.0)
            eyebrow_raise = max(0, min(1.0, (distance - 0.02) / 0.04))
            expressions['eyebrow_raise'] = eyebrow_raise
        
        # Mouth openness (speaking indicator)
        if mouth_top and mouth_bottom:
            mouth_openness = abs(mouth_bottom['y'] - mouth_top['y']) * 10
            expressions['mouth_open'] = min(mouth_openness, 1.0)
        
        return expressions
    
    def _calculate_gestures_enhanced(
        self, pose: List[Dict], left_hand: List[Dict], right_hand: List[Dict]
    ) -> Dict:
        """
        Enhanced gesture analysis using finger tracking
        
        NEW capabilities:
        - Detect hand shapes (open palm, fist, pointing)
        - Track individual finger positions
        - Better symmetry detection
        """
        # Get wrist positions from pose
        left_wrist = pose[15] if len(pose) > 15 else None
        right_wrist = pose[16] if len(pose) > 16 else None
        
        if not left_wrist or not right_wrist:
            return {'quality': 0, 'symmetry': 0}
        
        # Calculate wrist movement (if we have previous frame)
        movement = 0
        if self.previous_landmarks:
            prev_pose = self.previous_landmarks.get('pose', [])
            if len(prev_pose) > 16:
                prev_left = prev_pose[15]
                prev_right = prev_pose[16]
                
                left_move = np.sqrt(
                    (left_wrist['x'] - prev_left['x'])**2 +
                    (left_wrist['y'] - prev_left['y'])**2
                )
                right_move = np.sqrt(
                    (right_wrist['x'] - prev_right['x'])**2 +
                    (right_wrist['y'] - prev_right['y'])**2
                )
                movement = (left_move + right_move) / 2
        
        # Symmetry (bilateral movement)
        symmetry = 1.0 - min(abs(
            np.sqrt((left_wrist['x']**2 + left_wrist['y']**2)) -
            np.sqrt((right_wrist['x']**2 + right_wrist['y']**2))
        ), 1.0)
        
        # Hand shape detection (if hands are detected)
        hand_shapes = {}
        if left_hand:
            hand_shapes['left'] = self._detect_hand_shape(left_hand)
        if right_hand:
            hand_shapes['right'] = self._detect_hand_shape(right_hand)
        
        return {
            'movement': movement,
            'symmetry': symmetry,
            # Give credit for ANY movement, symmetry is a bonus (70% movement, 30% symmetry)
            # This means one-handed gestures score 70-80 instead of 30
            'quality': min(100, (movement * 1500) + (symmetry * 30)),
            'hand_shapes': hand_shapes
        }
    
    def _detect_hand_shape(self, hand: List[Dict]) -> str:
        """
        NEW: Detect hand shape from 21 finger landmarks
        
        Returns: 'open_palm', 'fist', 'pointing', 'thumbs_up', 'ok_sign', etc.
        """
        if len(hand) < 21:
            return 'unknown'
        
        # Get finger tips and bases
        wrist = hand[0]
        thumb_tip = hand[4]
        index_tip = hand[8]
        middle_tip = hand[12]
        ring_tip = hand[16]
        pinky_tip = hand[20]
        
        # Calculate distances from wrist
        tips = [thumb_tip, index_tip, middle_tip, ring_tip, pinky_tip]
        distances = [
            np.sqrt((tip['x'] - wrist['x'])**2 + (tip['y'] - wrist['y'])**2)
            for tip in tips
        ]
        
        # Simple heuristics
        avg_distance = np.mean(distances)
        
        if avg_distance > 0.15:
            return 'open_palm'  # Fingers extended
        elif avg_distance < 0.08:
            return 'fist'  # Fingers closed
        elif distances[1] > 0.12 and max(distances[2:]) < 0.10:
            return 'pointing'  # Index extended, others closed
        else:
            return 'gesture'  # Some other gesture
    
    def _calculate_gaze_precise(self, pose: List[Dict], face: List[Dict]) -> Dict:
        """
        NEW: Precise gaze tracking using actual eye landmarks
        Much more accurate than nose-proxy method
        """
        # Eye landmarks (468 face landmarks include detailed eye geometry)
        # Left eye: 33, 133, 159, 145
        # Right eye: 362, 263, 386, 374
        
        if len(face) < 386:
            return self._calculate_gaze_proxy(pose)
        
        left_eye_center = face[159]
        right_eye_center = face[386]
        nose = pose[0] if pose else face[1]
        
        # Calculate gaze direction from eye-to-nose vector
        eye_center_x = (left_eye_center['x'] + right_eye_center['x']) / 2
        eye_center_y = (left_eye_center['y'] + right_eye_center['y']) / 2
        
        gaze_x_offset = nose['x'] - eye_center_x
        gaze_y_offset = nose['y'] - eye_center_y
        
        # Forward-facing: Allow looking UP at audience (negative Y) and more horizontal range
        # Good eye contact = looking at/above camera, not down or far to sides
        looking_up_or_level = gaze_y_offset <= 0.08  # Allow looking up/at camera level
        not_too_far_left_right = abs(gaze_x_offset) < 0.12  # More horizontal tolerance
        
        is_forward = looking_up_or_level and not_too_far_left_right
        
        # Determine direction (only mark as "off" if CLEARLY looking away)
        if abs(gaze_x_offset) > 0.15:  # Much more lenient
            direction = 'left' if gaze_x_offset < 0 else 'right'
        elif gaze_y_offset > 0.12:  # Only "down" if clearly looking down
            direction = 'down'
        else:
            direction = 'forward'  # Default to forward (audience eye contact)
        
        return {
            'direction': direction,
            'is_forward': is_forward,
            'offset_x': gaze_x_offset,
            'offset_y': gaze_y_offset,
            'method': 'precise_eye_tracking'
        }
    
    def _calculate_gaze_proxy(self, pose: List[Dict]) -> Dict:
        """Fallback: nose-based gaze estimation (like JavaScript version)"""
        if not pose or len(pose) < 12:
            return {'direction': 'unknown', 'is_forward': False}
        
        nose = pose[0]
        left_shoulder = pose[11]
        right_shoulder = pose[12]
        
        shoulder_center_x = (left_shoulder['x'] + right_shoulder['x']) / 2
        nose_offset = nose['x'] - shoulder_center_x
        
        is_forward = abs(nose_offset) < 0.1
        direction = 'forward' if is_forward else ('left' if nose_offset < 0 else 'right')
        
        return {
            'direction': direction,
            'is_forward': is_forward,
            'offset_x': nose_offset,
            'method': 'nose_proxy'
        }
    
    def _calculate_movement(self, pose: List[Dict], timestamp: float) -> Dict:
        """
        Torso-centric movement for engagement detection
        Uses 33-point pose for more stable tracking
        """
        if not self.previous_landmarks or len(pose) < 25:
            return {'amount': 0, 'type': 'static'}
        
        prev_pose = self.previous_landmarks.get('pose', [])
        if len(prev_pose) < 25:
            return {'amount': 0, 'type': 'static'}
        
        # Torso keypoints (nose, shoulders, hips)
        torso_indices = [0, 11, 12, 23, 24]
        
        movement = 0
        for idx in torso_indices:
            if idx < len(pose) and idx < len(prev_pose):
                curr = pose[idx]
                prev = prev_pose[idx]
                
                dist = np.sqrt(
                    (curr['x'] - prev['x'])**2 +
                    (curr['y'] - prev['y'])**2
                )
                movement += dist
        
        movement /= len(torso_indices)
        
        # Add to window for temporal analysis
        self.movement_window.append({
            'timestamp': timestamp,
            'movement': movement
        })
        
        # Keep only last 3 seconds
        self.movement_window = [
            m for m in self.movement_window
            if timestamp - m['timestamp'] < 3.0
        ]
        
        # Classify movement type (RELAXED THRESHOLDS)
        if movement < 0.003:  # Was 0.006 - NOW MORE LENIENT
            movement_type = 'static'
        elif movement > 0.010:  # Was 0.015 - LOWER BAR FOR "DYNAMIC"
            movement_type = 'dynamic'
        else:
            movement_type = 'moderate'
        
        return {
            'amount': movement,
            'type': movement_type
        }
    
    def detect_events(self, metrics: Dict, timestamp: float) -> List[Dict]:
        """
        Detect body language events from metrics
        Returns list of events that occurred in this frame
        """
        events = []
        
        # Posture events
        if 'posture' in metrics:
            posture = metrics['posture']
            if posture['score'] < 60:
                events.append({
                    'type': 'posture',
                    'subtype': 'slouching',
                    'timestamp': timestamp,
                    'confidence': 1.0 - (posture['score'] / 100)
                })
        
        # Facial expression events
        if 'facial' in metrics:
            facial = metrics['facial']
            if facial.get('smile', 0) > 0.5:
                events.append({
                    'type': 'facial',
                    'subtype': 'smiling',
                    'timestamp': timestamp,
                    'confidence': facial['smile']
                })
        
        # Gesture events
        if 'gesture' in metrics:
            gesture = metrics['gesture']
            if gesture['movement'] > 0.03 and self.gesture_cooldown <= 0:
                events.append({
                    'type': 'gesture',
                    'subtype': 'hand_movement',
                    'timestamp': timestamp,
                    'symmetry': gesture['symmetry'],
                    'shapes': gesture.get('hand_shapes', {})
                })
                self.gesture_cooldown = 1.0  # 1 second cooldown
        
        # Gaze events
        if 'gaze' in metrics:
            gaze = metrics['gaze']
            if not gaze['is_forward']:
                events.append({
                    'type': 'gaze',
                    'subtype': 'looking_away',
                    'timestamp': timestamp,
                    'direction': gaze['direction']
                })
        
        # Movement/engagement events
        if len(self.movement_window) >= 30:  # 3 seconds at 10 FPS
            avg_movement = np.mean([m['movement'] for m in self.movement_window])
            if avg_movement > 0.015:
                events.append({
                    'type': 'movement',
                    'subtype': 'dynamic_engagement',
                    'timestamp': timestamp,
                    'movement_rate': avg_movement
                })
            elif avg_movement < 0.006:
                events.append({
                    'type': 'movement',
                    'subtype': 'static_period',
                    'timestamp': timestamp,
                    'movement_rate': avg_movement
                })
        
        # Decrement cooldowns
        if self.gesture_cooldown > 0:
            self.gesture_cooldown -= 0.1
        
        # Store events
        for event in events:
            self.timeline.append(event)
        
        return events
    
    def finalize(self, duration: float, total_frames: int) -> Dict:
        """
        Generate final analysis report with aggregates
        """
        logger.info(f"📊 Finalizing analysis: {total_frames} frames, {duration:.1f}s")
        
        # Calculate aggregates
        aggregates = self._calculate_aggregates(duration)
        
        # Generate debug report
        debug_report = self.debug_logger.generate_report()
        debug_file = self.debug_logger.save_report()
        logger.info(f"💾 Debug report saved: {debug_file}")
        
        return {
            'session_id': self.session_id,
            'session_meta': {
                'duration_seconds': duration,
                'total_frames': total_frames,
                'fps': total_frames / duration if duration > 0 else 0,
                'landmarks_per_frame': 543,
                'total_landmarks_processed': total_frames * 543
            },
            'aggregates': aggregates,
            'timeline': self.timeline,
            'debug': {
                'metrics_count': len(self.metrics_history),
                'events_count': len(self.timeline),
                'detailed_report': debug_report,
                'debug_file': debug_file
            }
        }
    
    def _calculate_aggregates(self, duration: float) -> Dict:
        """
        Calculate aggregate scores from all metrics
        PERCENTAGE-BASED: Score = (frames in good state / total frames) * 100
        """
        if not self.metrics_history:
            return {}
        
        total_frames = len(self.metrics_history)
        
        # Count frames in "good" state for each metric
        posture_good = sum(
            1 for m in self.metrics_history
            if m['metrics'].get('posture', {}).get('is_good', False)
        )
        
        eye_contact_good = sum(
            1 for m in self.metrics_history
            if m['metrics'].get('gaze', {}).get('is_forward', False)
        )
        
        gesture_good = sum(
            1 for m in self.metrics_history
            if m['metrics'].get('gesture', {}).get('quality', 0) >= 60
        )
        
        smile_present = sum(
            1 for m in self.metrics_history
            if m['metrics'].get('facial', {}).get('smile', 0) >= 0.3
        )
        
        engagement_good = sum(
            1 for m in self.metrics_history
            if m['metrics'].get('movement', {}).get('amount', 0) >= 0.003
        )
        
        # Calculate percentage scores (0-100)
        return {
            'posture_score': (posture_good / total_frames * 100) if total_frames > 0 else 0,
            'eye_contact_proxy': (eye_contact_good / total_frames * 100) if total_frames > 0 else 0,
            'gesture_quality': (gesture_good / total_frames * 100) if total_frames > 0 else 0,
            'smile_score': (smile_present / total_frames * 100) if total_frames > 0 else 0,
            'engagement_score': (engagement_good / total_frames * 100) if total_frames > 0 else 0,
            'gesture_frequency': (len([e for e in self.timeline if e['type'] == 'gesture']) / duration * 60) if duration > 0 else 0,
        }
    
    def _calculate_engagement_score_comprehensive(self, duration: float) -> float:
        """
        Calculate engagement score using FACIAL EXPRESSIONS (70%) + MOVEMENT (30%)
        Research shows facial cues are MORE indicative of engagement than body movement
        """
        if not self.metrics_history:
            return 60  # Default neutral
        
        # Extract facial and movement data
        facial_scores = []
        movement_scores = []
        
        for entry in self.metrics_history:
            metrics = entry['metrics']
            
            # FACIAL ENGAGEMENT (smile, eyebrows, expressiveness)
            if 'facial' in metrics:
                facial = metrics['facial']
                facial_engagement = 0
                
                # Smiling = high engagement (0-100)
                smile = facial.get('smile', 0)
                facial_engagement += smile * 40  # Max 40 points
                
                # Eyebrow raises = expressiveness (0-100)
                eyebrow = facial.get('eyebrow_raise', 0)
                facial_engagement += eyebrow * 30  # Max 30 points
                
                # Mouth movement = speaking/animated (0-100)
                mouth = facial.get('mouth_open', 0)
                facial_engagement += mouth * 30  # Max 30 points
                
                facial_scores.append(min(100, facial_engagement))
            
            # MOVEMENT ENGAGEMENT (torso movement)
            if 'movement' in metrics:
                movement = metrics['movement']['amount']
                
                # Optimal range: 0.003-0.010
                if 0.003 <= movement <= 0.010:
                    movement_score = 100
                elif movement < 0.003:
                    movement_score = (movement / 0.003) * 100
                else:
                    movement_score = max(0, 100 - ((movement - 0.010) * 1000))
                
                movement_scores.append(movement_score)
        
        # Calculate weighted average: 70% facial, 30% movement
        facial_avg = np.mean(facial_scores) if facial_scores else 50
        movement_avg = np.mean(movement_scores) if movement_scores else 50
        
        # FACIAL CUES ARE MORE IMPORTANT (70/30 split)
        final_score = (facial_avg * 0.70) + (movement_avg * 0.30)
        
        return min(100, max(0, final_score))

