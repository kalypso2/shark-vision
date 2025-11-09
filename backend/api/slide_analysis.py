"""
FastAPI endpoints for slide content analysis
Integrates Kyle's Gemini-powered slide analysis with the body language system
"""

from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse
from typing import Optional
import logging
from datetime import datetime
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from slide_analyzer import get_slide_analyzer

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/slide", tags=["slide_analysis"])


@router.post("/analyze-frame")
async def analyze_slide_frame(
    image: UploadFile = File(...),
    timestamp: Optional[float] = Form(None),
    session_id: Optional[str] = Form(None)
):
    """Analyze a single slide/frame from the presentation
    
    Args:
        image: Image file (JPG/PNG) of the slide/board
        timestamp: Optional timestamp in seconds for the frame
        session_id: Optional session ID to track across requests
        
    Returns:
        JSON with:
            - overall_score: 0-10 rating
            - issues: List of detected issues with severity
            - summary: Brief analysis summary
            - timestamp: Frame timestamp if provided
            - session_id: Session ID if provided
    """
    try:
        # Read image data
        image_data = await image.read()
        
        # Validate image
        if not image_data:
            raise HTTPException(status_code=400, detail="Empty image file")
        
        # Get analyzer and process
        analyzer = get_slide_analyzer()
        result = analyzer.analyze_frame(image_data)
        
        # Add metadata
        response = {
            **result,
            'timestamp': timestamp if timestamp is not None else 0.0,
            'timestamp_formatted': analyzer.format_timestamp(timestamp) if timestamp is not None else "00:00",
            'analyzed_at': datetime.now().isoformat()
        }
        
        if session_id:
            response['session_id'] = session_id
        
        if result.get('success', False):
            return JSONResponse(content=response, status_code=200)
        else:
            return JSONResponse(content=response, status_code=500)
            
    except Exception as e:
        logger.error(f"Slide analysis endpoint error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze-batch")
async def analyze_batch_slides(
    images: list[UploadFile] = File(...),
    session_id: Optional[str] = Form(None)
):
    """Analyze multiple slides in batch
    
    Args:
        images: List of image files
        session_id: Optional session ID
        
    Returns:
        JSON with analysis results for each slide
    """
    try:
        analyzer = get_slide_analyzer()
        results = []
        
        for idx, image in enumerate(images):
            image_data = await image.read()
            result = analyzer.analyze_frame(image_data)
            results.append({
                **result,
                'slide_number': idx + 1,
                'filename': image.filename
            })
        
        return JSONResponse(content={
            'success': True,
            'total_slides': len(results),
            'results': results,
            'session_id': session_id
        })
        
    except Exception as e:
        logger.error(f"Batch analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check():
    """Check if slide analysis service is healthy"""
    analyzer = get_slide_analyzer()
    return {
        'status': 'healthy' if analyzer.model else 'degraded',
        'service': 'slide_analysis',
        'gemini_configured': analyzer.model is not None
    }

