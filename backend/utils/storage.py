"""
Storage Manager
Handles saving and retrieving analysis sessions
"""

import json
import os
from pathlib import Path
from typing import Dict, Optional, Any
import logging
import numpy as np

logger = logging.getLogger(__name__)


class StorageManager:
    """Manages persistent storage of analysis sessions"""
    
    def __init__(self, base_path: str = "./storage"):
        self.base_path = Path(base_path)
        self.analysis_path = self.base_path / "analysis"
        self.videos_path = self.base_path / "videos"
        
        # Create directories
        self.analysis_path.mkdir(parents=True, exist_ok=True)
        self.videos_path.mkdir(parents=True, exist_ok=True)
    
    def save_analysis(self, session_id: str, analysis: Dict, coaching: str, slide_analysis: Optional[Dict] = None) -> bool:
        """
        Save analysis and coaching to disk
        
        Args:
            session_id: Unique session identifier
            analysis: Full analysis dict
            coaching: Coaching feedback string
            slide_analysis: Optional slide content analysis data
        
        Returns:
            True if successful
        """
        try:
            # Combine analysis, coaching, and slide analysis
            data = self._sanitize({
                'session_id': session_id,
                'analysis': analysis,
                'coaching': coaching,
                'slide_analysis': slide_analysis
            })
            
            # Save atomically: write to temp then replace
            file_path = self.analysis_path / f"{session_id}.json"
            temp_path = file_path.with_suffix('.json.tmp')
            with open(temp_path, 'w') as f:
                json.dump(data, f, indent=2)
                f.flush()
                os.fsync(f.fileno())
            
            os.replace(temp_path, file_path)
            
            logger.info(f"✅ Saved analysis: {file_path}")
            return True
        
        except Exception as e:
            logger.error(f"Error saving analysis: {e}", exc_info=True)
            return False
    
    def load_analysis(self, session_id: str) -> Optional[Dict]:
        """
        Load analysis from disk
        
        Args:
            session_id: Session to load
        
        Returns:
            Analysis dict or None if not found
        """
        try:
            file_path = self.analysis_path / f"{session_id}.json"
            
            if not file_path.exists():
                logger.warning(f"Session not found: {session_id}")
                return None
            
            with open(file_path, 'r') as f:
                data = json.load(f)
            
            return data
        
        except Exception as e:
            logger.error(f"Error loading analysis: {e}", exc_info=True)
            return None
    
    def list_sessions(self) -> list[str]:
        """List all saved session IDs"""
        return [
            f.stem for f in self.analysis_path.glob("*.json")
        ]

    def _sanitize(self, obj: Any):
        """
        Recursively convert objects (numpy types, tuples, etc.) to JSON-serializable
        Python primitives.
        """
        if isinstance(obj, (np.bool_, np.bool8)):
            return bool(obj)
        if isinstance(obj, (np.integer,)):
            return int(obj)
        if isinstance(obj, (np.floating,)):
            return float(obj)
        if isinstance(obj, dict):
            return {k: self._sanitize(v) for k, v in obj.items()}
        if isinstance(obj, (list, tuple)):
            return [self._sanitize(v) for v in obj]
        return obj

