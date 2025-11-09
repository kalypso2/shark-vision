"""
Video Recorder for Presentation Sessions
Records frames during real-time analysis and saves as MP4
"""

import cv2
import numpy as np
from pathlib import Path
import logging
from typing import Optional

logger = logging.getLogger(__name__)


class VideoRecorder:
    """Records video frames during analysis session"""
    
    def __init__(self, session_id: str, fps: int = 10, output_dir: str = "./storage"):
        self.session_id = session_id
        self.fps = fps
        # Use absolute path from backend directory
        self.output_dir = Path(output_dir).resolve()
        self.output_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"📁 Video output directory: {self.output_dir}")
        
        self.video_path = self.output_dir / f"{session_id}.mp4"
        self.writer: Optional[cv2.VideoWriter] = None
        self.frame_count = 0
        self.width = None
        self.height = None
        
    def add_frame(self, frame: np.ndarray):
        """Add a frame to the video"""
        try:
            # Initialize writer on first frame
            if self.writer is None:
                self.height, self.width = frame.shape[:2]
                # Use H.264 codec (avc1) for better browser compatibility
                fourcc = cv2.VideoWriter_fourcc(*'avc1')
                self.writer = cv2.VideoWriter(
                    str(self.video_path),
                    fourcc,
                    self.fps,
                    (self.width, self.height)
                )
                logger.info(f"📹 Started recording: {self.video_path} ({self.width}x{self.height} @ {self.fps} FPS, H.264 codec)")
            
            # Write frame
            self.writer.write(frame)
            self.frame_count += 1
            
        except Exception as e:
            logger.error(f"Failed to write frame: {e}")
    
    def finalize(self) -> Optional[str]:
        """Close the video file and return path"""
        if self.writer is not None:
            self.writer.release()
            logger.info(f"✅ Video saved: {self.video_path} ({self.frame_count} frames)")
            return str(self.video_path)
        return None
    
    def __del__(self):
        """Cleanup on deletion"""
        if self.writer is not None:
            self.writer.release()

