"""
Audio Recorder for Speech Analysis
Saves audio chunks during real-time analysis for transcription
"""

import os
import logging
from pathlib import Path
from typing import List

logger = logging.getLogger(__name__)


class AudioRecorder:
    """Records audio chunks during analysis session"""
    
    def __init__(self, session_id: str, output_dir: str = "./storage"):
        self.session_id = session_id
        # Use absolute path from backend directory
        self.output_dir = Path(output_dir).resolve() / "audio"
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        self.session_dir = self.output_dir / session_id
        self.session_dir.mkdir(parents=True, exist_ok=True)
        
        self.audio_chunks: List[str] = []
        self.chunk_count = 0
        
        logger.info(f"🎤 Audio output directory: {self.session_dir}")
    
    def save_chunk(self, audio_data: bytes, extension: str = '.webm') -> str:
        """
        Save an audio chunk
        
        Args:
            audio_data: Raw audio bytes
            extension: File extension (e.g. .webm, .ogg)
        
        Returns:
            Path to saved audio file
        """
        try:
            self.chunk_count += 1
            ext = extension if extension.startswith('.') else f'.{extension}'
            chunk_path = self.session_dir / f"chunk_{self.chunk_count:04d}{ext}"
            
            with open(chunk_path, 'wb') as f:
                f.write(audio_data)
            
            self.audio_chunks.append(str(chunk_path))
            
            if self.chunk_count % 10 == 0:
                logger.info(f"🎤 Saved audio chunk {self.chunk_count}")
            
            return str(chunk_path)
            
        except Exception as e:
            logger.error(f"Failed to save audio chunk: {e}")
            return None
    
    def get_chunks(self) -> List[str]:
        """Get list of all audio chunk paths"""
        return self.audio_chunks
    
    def finalize(self) -> int:
        """Finalize recording and return total chunks"""
        logger.info(f"✅ Audio recording complete: {self.chunk_count} chunks saved")
        return self.chunk_count

