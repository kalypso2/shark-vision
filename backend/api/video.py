"""
Video API endpoint
Serves recorded presentation videos
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pathlib import Path
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/api/sessions/{session_id}/video")
async def get_video(session_id: str):
    """Serve the recorded video for a session"""
    video_path = Path("../storage") / f"{session_id}.mp4"
    
    if not video_path.exists():
        raise HTTPException(status_code=404, detail="Video not found")
    
    return FileResponse(
        path=str(video_path),
        media_type="video/mp4",
        filename=f"{session_id}.mp4"
    )

