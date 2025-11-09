"""
Shark Vision Python Backend
FastAPI + MediaPipe Holistic + RAG System
Real-time webcam body language analysis
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import asyncio
import logging
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

from body_language.detector import HolisticDetector
from body_language.analyzer import BodyLanguageAnalyzer
from rag.context_builder import build_context, format_context_for_prompt
from api.coaching import generate_coaching
from api.slide_analysis import router as slide_router
from slide_analyzer import get_slide_analyzer
from utils.frame_processor import FrameProcessor
from utils.storage import StorageManager
from utils.video_recorder import VideoRecorder
from fastapi.responses import FileResponse
from pathlib import Path as FilePath
import base64

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables for backend (Gemini API key, etc.)
ROOT_DIR = Path(__file__).resolve().parent
load_dotenv(ROOT_DIR / ".env")
load_dotenv(ROOT_DIR.parent / ".env")
load_dotenv(ROOT_DIR.parent / ".env.local")

# Initialize components (before lifespan uses them)
detector = HolisticDetector()
storage = StorageManager()

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app_instance: FastAPI):
    """Manage application lifespan (startup and shutdown)"""
    # Startup
    logger.info("🦈 Shark Vision Python Backend Starting...")
    logger.info("📊 MediaPipe Holistic: 543 landmarks (pose + face + hands)")
    logger.info("🧠 RAG System: Research-backed coaching")
    await detector.initialize()
    logger.info("✅ Backend ready!")
    
    yield
    
    # Shutdown
    logger.info("👋 Shutting down Shark Vision Backend...")

# Initialize FastAPI with lifespan
app = FastAPI(
    title="Shark Vision API",
    description="Real-time body language analysis with MediaPipe Holistic + RAG",
    version="2.0.0",
    lifespan=lifespan
)

# CORS middleware for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include slide analysis router
app.include_router(slide_router)

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "running",
        "backend": "python",
        "version": "2.0.0",
        "features": {
            "landmarks": 543,
            "pose_points": 33,
            "face_points": 468,
            "hand_points": 42,  # 21 per hand
            "rag_system": True,
            "real_time": True
        }
    }

@app.get("/api/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "detector": "mediapipe-holistic",
        "model_loaded": detector.is_initialized(),
        "timestamp": datetime.now().isoformat()
    }

@app.websocket("/ws/analyze")
async def analyze_stream(websocket: WebSocket):
    """
    Real-time analysis WebSocket endpoint
    
    Flow:
    1. Browser connects
    2. Browser sends video frames (JPEG, 10 FPS)
    3. Python processes with MediaPipe Holistic (543 landmarks)
    4. Python sends back real-time metrics and events
    5. On disconnect, generate final analysis + RAG coaching
    """
    await websocket.accept()
    logger.info("🔌 Client connected to analysis stream")
    
    # Create session (ms precision to avoid collisions)
    session_id = f"session_{int(datetime.now().timestamp() * 1000)}"
    
    # Send session ID to frontend immediately
    await websocket.send_json({
        'type': 'session_id',
        'session_id': session_id
    })
    logger.info(f"📤 Sent session ID to frontend: {session_id}")
    
    analyzer = BodyLanguageAnalyzer(session_id)
    frame_processor = FrameProcessor()
    video_recorder = VideoRecorder(session_id, fps=10)
    slide_analyzer_instance = get_slide_analyzer()  # Get slide analyzer
    
    # Slide analysis tracking (analyze every 3 seconds)
    slide_analyses = []
    slide_analysis_interval = 3.0  # seconds
    last_slide_analysis_time = -slide_analysis_interval  # ensure immediate first capture
    
    frame_count = 0
    start_time = datetime.now()
    
    try:
        while True:
            # Receive frame from browser (binary JPEG data)
            frame_data = await websocket.receive_bytes()
            frame_count += 1
            
            # Decode frame
            frame = frame_processor.decode_frame(frame_data)
            if frame is None:
                logger.warning(f"Failed to decode frame {frame_count}")
                continue
            
            # Save frame to video
            video_recorder.add_frame(frame)
            
            # Process with MediaPipe Holistic
            landmarks = await detector.process_async(frame)
            
            if landmarks is None:
                # No person detected
                await websocket.send_json({
                    'type': 'no_detection',
                    'frame': frame_count,
                    'message': 'No person detected in frame'
                })
                continue
            
            # Calculate current time
            elapsed = (datetime.now() - start_time).total_seconds()
            
            # Analyze slide content (every 3 seconds if Gemini is configured)
            if slide_analyzer_instance.is_configured() and (elapsed - last_slide_analysis_time >= slide_analysis_interval):
                try:
                    # Encode frame as JPEG base64
                    import cv2
                    _, buffer = cv2.imencode('.jpg', frame)
                    jpg_as_text = base64.b64encode(buffer).decode('utf-8')
                    data_url = f"data:image/jpeg;base64,{jpg_as_text}"
                    
                    # Analyze slide
                    slide_result = slide_analyzer_instance.analyze_frame(data_url)
                    if slide_result.get('success'):
                        # Format timestamp as MM:SS
                        mins = int(elapsed // 60)
                        secs = int(elapsed % 60)
                        timestamp_formatted = f"{mins}:{secs:02d}"
                        
                        slide_analyses.append({
                            'timestamp': elapsed,
                            'timestamp_formatted': timestamp_formatted,
                            'overall_score': slide_result.get('overall_score', 0),
                            'summary': slide_result.get('summary', ''),
                            'issues': slide_result.get('issues', [])
                        })
                        logger.info(f"📊 Slide analyzed at {timestamp_formatted}: Score {slide_result.get('overall_score')}/10")
                    
                    last_slide_analysis_time = elapsed
                except Exception as e:
                    logger.error(f"Error analyzing slide: {e}")
            
            # Analyze landmarks
            metrics = analyzer.calculate_metrics(landmarks, elapsed)
            events = analyzer.detect_events(metrics, elapsed)
            
            # Create live status indicators (GOOD/BAD only)
            live_status = {
                'posture': 'good' if metrics.get('posture', {}).get('is_good', False) else 'bad',
                'eye_contact': 'good' if metrics.get('gaze', {}).get('is_forward', False) else 'bad',
                'gestures': 'good' if metrics.get('gesture', {}).get('quality', 0) >= 60 else 'bad',
                'smile': 'good' if metrics.get('facial', {}).get('smile', 0) >= 0.3 else 'neutral',
                'engagement': 'good' if metrics.get('movement', {}).get('amount', 0) >= 0.003 else 'low'
            }
            
            # Send real-time update with LIVE STATUS (not scores)
            await websocket.send_json({
                'type': 'update',
                'frame': frame_count,
                'timestamp': elapsed,
                'live_status': live_status,  # Simple good/bad indicators
                'metrics': metrics,  # Full metrics for debugging
                'events': events,
                'landmarks': {
                    'pose': len(landmarks.get('pose', [])),
                    'face': len(landmarks.get('face', [])),
                    'hands': len(landmarks.get('left_hand', []) + landmarks.get('right_hand', []))
                }
            })
            
            # Log progress every 50 frames
            if frame_count % 50 == 0:
                logger.info(f"📊 Processed {frame_count} frames ({elapsed:.1f}s)")
    
    except WebSocketDisconnect:
        logger.info("🔌 Client disconnected - generating final analysis...")
    
    except Exception as e:
        logger.error(f"❌ Error in analysis: {e}", exc_info=True)
    
    finally:
        # Always generate final analysis even if client disconnected
        logger.info("📹 Finalizing video...")
        video_path = video_recorder.finalize()
        
        logger.info("📋 Generating final analysis...")
        duration = (datetime.now() - start_time).total_seconds()
        try:
            analysis = analyzer.finalize(duration, frame_count)
            analysis['video_path'] = video_path
        except Exception as e:
            logger.error(f"❌ finalize() failed, saving minimal analysis: {e}", exc_info=True)
            # Minimal fallback analysis to ensure session exists for frontend redirect
            analysis = {
                "session_id": session_id,
                "session_meta": {
                    "duration_seconds": duration,
                    "total_frames": frame_count,
                    "fps": 10,
                    "landmarks_per_frame": 543,
                    "total_landmarks_processed": 0
                },
                "aggregates": {
                    "posture_score": 0,
                    "eye_contact_proxy": 0,
                    "gesture_quality": 0,
                    "gesture_frequency": 0,
                    "engagement_score": 0,
                    "smile_score": 0
                },
                "timeline": [],
                "debug": {
                    "metrics_count": 0,
                    "events_count": 0
                },
                "video_path": video_path
            }
        
    # Aggregate slide analysis data
    slide_analysis_summary = None
    if slide_analyses:
        total_score = sum(s['overall_score'] for s in slide_analyses)
        avg_score = total_score / len(slide_analyses) if slide_analyses else 0
        total_issues = sum(len(s['issues']) for s in slide_analyses)
        
        slide_analysis_summary = {
            'frames_analyzed': len(slide_analyses),
            'average_score': avg_score,
            'total_issues': total_issues,
            'timestamped_issues': slide_analyses
        }
        logger.info(f"📊 Slide analysis summary: {len(slide_analyses)} frames, avg score {avg_score:.1f}/10, {total_issues} issues")
    
    # Save immediately so frontend can find the session while coaching generates
    logger.info("💾 Saving session (initial, coaching pending)...")
    saved = storage.save_analysis(session_id, analysis, coaching="", slide_analysis=slide_analysis_summary)
    if not saved:
        logger.error("❌ Failed to save initial session JSON")
    else:
        logger.info("✅ Initial analysis JSON saved")
    
    async def _finalize_coaching_and_update():
        try:
            logger.info("🧠 Building RAG context...")
            rag_context = build_context(analysis)
            context_prompt = format_context_for_prompt(rag_context)
            
            logger.info("🤖 Generating AI coaching...")
            coaching_text = await generate_coaching(analysis, context_prompt)
            
            logger.info("💾 Updating session with coaching...")
            storage.save_analysis(session_id, analysis, coaching_text, slide_analysis=slide_analysis_summary)
            logger.info("✅ Coaching saved")
        except Exception as e:
            logger.error(f"❌ Coaching generation failed: {e}", exc_info=True)
    
    # Run coaching generation in background so the API responds immediately
    asyncio.create_task(_finalize_coaching_and_update())
    
    logger.info(f"✅ Session {session_id} analysis saved (video ready, coaching pending)")
    logger.info(f"🌐 Results: http://localhost:3000/results-python/{session_id}")

@app.get("/api/sessions/{session_id}")
async def get_session(session_id: str):
    """Retrieve saved analysis session"""
    data = storage.load_analysis(session_id)
    if data is None:
        return JSONResponse(
            status_code=404,
            content={"error": "Session not found"}
        )
    return data

@app.get("/api/sessions/{session_id}/video")
async def get_video(session_id: str):
    """Serve the recorded video for a session with proper headers for browser playback"""
    video_path = FilePath("./storage").resolve() / f"{session_id}.mp4"
    
    logger.info(f"Looking for video at: {video_path}")
    
    if not video_path.exists():
        logger.warning(f"Video not found: {video_path}")
        return JSONResponse(
            status_code=404,
            content={"error": f"Video not found: {video_path}"}
        )
    
    return FileResponse(
        path=str(video_path),
        media_type="video/mp4",
        filename=f"{session_id}.mp4",
        headers={
            "Accept-Ranges": "bytes",
            "Cache-Control": "public, max-age=3600"
        }
    )

@app.get("/api/debug/knowledge-base")
async def get_knowledge_base():
    """Debug endpoint: View RAG knowledge base"""
    from rag.knowledge_base import KNOWLEDGE_BASE, get_benchmarks
    
    return {
        "total_entries": len(KNOWLEDGE_BASE),
        "benchmarks": len(get_benchmarks()),
        "entries": [
            {
                "id": entry.id,
                "type": entry.type,
                "category": entry.category,
                "source": entry.source,
                "has_quantitative_data": entry.quantitative_data is not None
            }
            for entry in KNOWLEDGE_BASE
        ]
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

