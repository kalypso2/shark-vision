"""
Frame Processing Utilities
Handles decoding and preprocessing of video frames
"""

import cv2
import numpy as np
from PIL import Image
import io
import logging

logger = logging.getLogger(__name__)


class FrameProcessor:
    """Processes video frames from browser WebSocket"""
    
    def decode_frame(self, frame_data: bytes) -> np.ndarray:
        """
        Decode JPEG bytes to OpenCV frame
        
        Args:
            frame_data: JPEG image bytes from browser
        
        Returns:
            numpy array (BGR format for OpenCV/MediaPipe)
        """
        try:
            # Decode JPEG to numpy array
            nparr = np.frombuffer(frame_data, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if frame is None:
                logger.warning("Failed to decode frame")
                return None
            
            return frame
        
        except Exception as e:
            logger.error(f"Error decoding frame: {e}")
            return None
    
    def resize_frame(self, frame: np.ndarray, max_width: int = 640) -> np.ndarray:
        """
        Resize frame while maintaining aspect ratio
        Useful for reducing processing time
        """
        height, width = frame.shape[:2]
        
        if width <= max_width:
            return frame
        
        ratio = max_width / width
        new_height = int(height * ratio)
        
        return cv2.resize(frame, (max_width, new_height))
    
    def encode_frame(self, frame: np.ndarray, quality: int = 80) -> bytes:
        """
        Encode frame to JPEG bytes
        
        Args:
            frame: OpenCV frame (BGR)
            quality: JPEG quality (0-100)
        
        Returns:
            JPEG bytes
        """
        _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, quality])
        return buffer.tobytes()

