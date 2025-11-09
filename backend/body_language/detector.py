"""
MediaPipe Holistic Detector
Provides 543 landmarks: 33 pose + 468 face + 21 left hand + 21 right hand
"""

import mediapipe as mp
import cv2
import numpy as np
import asyncio
from typing import Optional, Dict, List
import logging

logger = logging.getLogger(__name__)

class HolisticDetector:
    """
    Wrapper for MediaPipe Holistic
    Detects pose, face, and hands simultaneously
    """
    
    def __init__(self):
        self.mp_holistic = mp.solutions.holistic
        self.holistic = None
        self._initialized = False
    
    async def initialize(self):
        """Initialize MediaPipe Holistic model"""
        if self._initialized:
            return
        
        logger.info("🔧 Initializing MediaPipe Holistic...")
        
        self.holistic = self.mp_holistic.Holistic(
            static_image_mode=False,        # Video stream mode
            model_complexity=2,             # Highest accuracy (0, 1, or 2)
            smooth_landmarks=True,          # Temporal smoothing
            enable_segmentation=False,      # Don't need person segmentation
            smooth_segmentation=False,
            refine_face_landmarks=True,     # Extra precision for eyes/lips
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        
        self._initialized = True
        logger.info("✅ MediaPipe Holistic ready (543 landmarks)")
    
    def is_initialized(self) -> bool:
        return self._initialized
    
    async def process_async(self, frame: np.ndarray) -> Optional[Dict]:
        """
        Process frame asynchronously (non-blocking)
        Returns landmarks or None if no person detected
        """
        # Run in executor to avoid blocking event loop
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self.process, frame)
    
    def process(self, frame: np.ndarray) -> Optional[Dict]:
        """
        Process frame and extract all landmarks
        
        Returns:
            {
                'pose': List[33 landmarks],
                'face': List[468 landmarks],
                'left_hand': List[21 landmarks],
                'right_hand': List[21 landmarks]
            }
            or None if no person detected
        """
        if not self._initialized:
            raise RuntimeError("Detector not initialized. Call initialize() first.")
        
        # Convert BGR (OpenCV) to RGB (MediaPipe)
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Process with MediaPipe
        results = self.holistic.process(rgb_frame)
        
        # Check if person was detected
        if not results.pose_landmarks:
            return None
        
        # Extract all landmark groups
        return {
            'pose': self._extract_landmarks(results.pose_landmarks, 'pose'),
            'face': self._extract_landmarks(results.face_landmarks, 'face'),
            'left_hand': self._extract_landmarks(results.left_hand_landmarks, 'hand'),
            'right_hand': self._extract_landmarks(results.right_hand_landmarks, 'hand'),
        }
    
    def _extract_landmarks(self, landmarks, landmark_type: str) -> List[Dict]:
        """
        Convert MediaPipe landmarks to our format
        
        Each landmark has:
        - x, y: Normalized coordinates [0, 1]
        - z: Depth (relative to hip midpoint for pose)
        - visibility: Confidence that landmark is visible (pose only)
        """
        if not landmarks:
            return []
        
        extracted = []
        for idx, lm in enumerate(landmarks.landmark):
            landmark_dict = {
                'index': idx,
                'x': float(lm.x),
                'y': float(lm.y),
                'z': float(lm.z),
            }
            
            # Pose landmarks have visibility, face/hands don't
            if landmark_type == 'pose':
                landmark_dict['visibility'] = float(lm.visibility)
            else:
                landmark_dict['visibility'] = 1.0  # Assume visible if detected
            
            extracted.append(landmark_dict)
        
        return extracted
    
    def get_landmark_names(self, landmark_type: str) -> List[str]:
        """Get human-readable names for landmarks"""
        if landmark_type == 'pose':
            return [
                'nose', 'left_eye_inner', 'left_eye', 'left_eye_outer',
                'right_eye_inner', 'right_eye', 'right_eye_outer',
                'left_ear', 'right_ear', 'mouth_left', 'mouth_right',
                'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
                'left_wrist', 'right_wrist', 'left_pinky', 'right_pinky',
                'left_index', 'right_index', 'left_thumb', 'right_thumb',
                'left_hip', 'right_hip', 'left_knee', 'right_knee',
                'left_ankle', 'right_ankle', 'left_heel', 'right_heel',
                'left_foot_index', 'right_foot_index'
            ]
        elif landmark_type == 'hand':
            return [
                'wrist', 'thumb_cmc', 'thumb_mcp', 'thumb_ip', 'thumb_tip',
                'index_mcp', 'index_pip', 'index_dip', 'index_tip',
                'middle_mcp', 'middle_pip', 'middle_dip', 'middle_tip',
                'ring_mcp', 'ring_pip', 'ring_dip', 'ring_tip',
                'pinky_mcp', 'pinky_pip', 'pinky_dip', 'pinky_tip'
            ]
        else:
            # Face has 468 landmarks - too many to name individually
            return [f'face_{i}' for i in range(468)]
    
    def close(self):
        """Clean up resources"""
        if self.holistic:
            self.holistic.close()
            self._initialized = False

