"""
Shark Vision Python Backend
FastAPI + MediaPipe Holistic + RAG System
Real-time webcam body language analysis
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
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
from utils.audio_recorder import AudioRecorder
from speech import SpeechTranscriber, SpeechAnalyzer
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
    allow_origins=["http://localhost:3000", "http://localhost:3001"],  # Allow both ports
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
    logger.info(f"🎬 Starting analysis for session: {session_id}")
    
    analyzer = BodyLanguageAnalyzer(session_id)
    frame_processor = FrameProcessor()
    video_recorder = VideoRecorder(session_id, fps=10)
    audio_recorder = AudioRecorder(session_id)
    slide_analyzer_instance = get_slide_analyzer()  # Get slide analyzer
    speech_transcriber = SpeechTranscriber()
    speech_analyzer = SpeechAnalyzer()
    
    # Slide analysis tracking (analyze every 30 seconds - slides don't change often)
    slide_analyses = []
    slide_analysis_interval = 30.0  # seconds
    last_slide_analysis_time = -slide_analysis_interval  # ensure immediate first capture
    
    # Speech transcription tracking
    transcription_segments = []
    full_transcript = ""
    
    frame_count = 0
    start_time = None  # Will be set on first frame
    
    try:
        while True:
            # Receive frame from browser (binary JPEG data)
            frame_data = await websocket.receive_bytes()
            if not frame_data:
                logger.warning("❌ Received empty frame from client")
                continue
            
            # Set start time on first frame (not at connection time)
            if start_time is None:
                start_time = datetime.now()
                logger.info(f"⏱️  Recording started at {start_time.strftime('%H:%M:%S')}")
            
            frame_count += 1
            
            # Decode frame
            frame = frame_processor.decode_frame(frame_data)
            if frame is None:
                logger.error(f"❌ Failed to decode frame {frame_count}")
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
            
            # Calculate current time elapsed since first frame
            elapsed = (datetime.now() - start_time).total_seconds()
            
            # Log milestone every 30 frames (~3 seconds at 10 FPS)
            if frame_count % 30 == 0:
                actual_fps = frame_count / elapsed if elapsed > 0 else 0
                logger.info(f"📊 {frame_count} frames processed in {elapsed:.1f}s (avg {actual_fps:.1f} FPS)")
            
            # Analyze slide content (every 30 seconds - slides don't change often)
            # Run in background to avoid blocking real-time updates
            if slide_analyzer_instance.is_configured() and (elapsed - last_slide_analysis_time >= slide_analysis_interval):
                last_slide_analysis_time = elapsed
                
                async def analyze_slide_async():
                    try:
                        # Encode frame as JPEG bytes
                        import cv2
                        _, buffer = cv2.imencode('.jpg', frame)
                        jpg_bytes = buffer.tobytes()
                        
                        # Analyze slide (blocking Gemini call)
                        slide_result = slide_analyzer_instance.analyze_frame(jpg_bytes)
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
                            logger.info(f"📊 Slide {timestamp_formatted}: {slide_result.get('overall_score')}/10")
                    except Exception as e:
                        logger.error(f"❌ Slide analysis error: {e}")
                
                # Run in background - don't wait for it
                asyncio.create_task(analyze_slide_async())
            
            # Analyze landmarks (still needed for final analysis)
            metrics = analyzer.calculate_metrics(landmarks, elapsed)
            events = analyzer.detect_events(metrics, elapsed)
            
            # Send minimal progress update (every 10th frame)
            if frame_count % 10 == 0:
                await websocket.send_json({
                    'type': 'progress',
                    'frame': frame_count,
                    'timestamp': elapsed
                })
    
    except WebSocketDisconnect as e:
        logger.info(f"🔌 Client disconnected (reason: {e}) - generating final analysis...")
    
    except Exception as e:
        logger.error(f"❌ Error in analysis: {e}", exc_info=True)
    
    finally:
        # Always generate final analysis even if client disconnected
        logger.info(f"🏁 Entered finally block for session: {session_id}")
        logger.info(f"📊 Final stats: {frame_count} frames processed")
        
        # Calculate duration (handle case where no frames were received)
        if start_time is None:
            logger.warning("⚠️  No frames received - session aborted")
            return  # Exit early if no recording happened
        
        duration = (datetime.now() - start_time).total_seconds()
        
        # Run video finalization and analysis in TRUE parallel (separate threads)
        logger.info("⚡ Finalizing video and analysis...")
        
        try:
            # Run blocking operations in separate threads for real parallelization
            video_path, analysis = await asyncio.gather(
                asyncio.to_thread(video_recorder.finalize),
                asyncio.to_thread(analyzer.finalize, duration, frame_count)
            )
            analysis['video_path'] = video_path
            logger.info("✅ Finalized in parallel")
        except Exception as e:
            logger.error(f"❌ Finalize failed: {e}", exc_info=True)
            # Minimal fallback analysis
            video_path = video_recorder.finalize()
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
        
    # Aggregate slide analysis data (fast)
    slide_analysis_summary = None
    if slide_analyses:
        slide_analysis_summary = {
            'frames_analyzed': len(slide_analyses),
            'average_score': sum(s['overall_score'] for s in slide_analyses) / len(slide_analyses),
            'total_issues': sum(len(s['issues']) for s in slide_analyses),
            'timestamped_issues': slide_analyses
        }
    
    # Aggregate speech analysis data
    speech_analysis_summary = None
    if session_id in active_sessions_speech:
        session_speech = active_sessions_speech[session_id]
        full_transcript = session_speech['full_transcript'].strip()
        
        # Perform final analysis on full transcript
        final_speech_analysis = session_speech['analyzer'].finalize(full_transcript)
        
        speech_analysis_summary = {
            'oral_presentation_score': final_speech_analysis['oral_presentation_score'],
            'scores': final_speech_analysis['scores'],
            'total_issues': len(final_speech_analysis['issues']),
            'issues': final_speech_analysis['issues'],
            'dialect_feedback': final_speech_analysis['dialect_feedback'],
            'grammar_feedback': final_speech_analysis['grammar_feedback'],
            'segments': session_speech['segments'],
            'full_transcript': full_transcript,
            'total_chunks': len(session_speech['segments'])
        }
        
        # Cleanup
        del active_sessions_speech[session_id]
        logger.info(f"🎤 Speech analysis complete: {final_speech_analysis['oral_presentation_score']:.1f}/10")
    
    # Save immediately so frontend can find the session while coaching generates
    logger.info("💾 Saving session...")
    saved = storage.save_analysis(session_id, analysis, coaching="", slide_analysis=slide_analysis_summary, speech_analysis=speech_analysis_summary)
    if saved:
        logger.info(f"✅ Session saved → http://localhost:3001/results-python/{session_id}")
    else:
        logger.error("❌ Failed to save session JSON")
    
    async def _finalize_coaching_and_update():
        try:
            logger.info("🤖 Generating AI coaching (background)...")
            rag_context = build_context(analysis)
            context_prompt = format_context_for_prompt(rag_context)
            coaching_text = await generate_coaching(analysis, context_prompt)
            storage.save_analysis(session_id, analysis, coaching_text, slide_analysis=slide_analysis_summary, speech_analysis=speech_analysis_summary)
            logger.info("✅ AI coaching complete")
        except Exception as e:
            logger.error(f"❌ Coaching failed: {e}")
    
    # Run coaching generation in background (non-blocking)
    asyncio.create_task(_finalize_coaching_and_update())

# Global storage for audio/speech data during active sessions
active_sessions_speech = {}

@app.post("/api/sessions/{session_id}/audio")
async def upload_audio_chunk(session_id: str, request: Request):
    """
    Receive audio chunk for speech analysis
    
    Args:
        session_id: Session identifier
        request: Raw request containing audio bytes (WebM/Opus format)
    """
    # Read raw audio bytes from request body
    audio = await request.body()
    
    if not audio or len(audio) == 0:
        return JSONResponse(
            status_code=400,
            content={"error": "No audio data provided"}
        )
    
    try:
        # Initialize session speech data if needed
        if session_id not in active_sessions_speech:
            active_sessions_speech[session_id] = {
                'audio_recorder': AudioRecorder(session_id),
                'transcriber': SpeechTranscriber(),
                'analyzer': SpeechAnalyzer(),
                'segments': [],
                'full_transcript': ""
            }
        
        session_data = active_sessions_speech[session_id]
        
        # Determine file extension from request content type
        content_type = request.headers.get('content-type', 'audio/webm')
        extension = '.ogg' if 'ogg' in content_type else '.webm'
        
        # Save audio chunk
        audio_path = session_data['audio_recorder'].save_chunk(audio, extension=extension)
        
        if not audio_path:
            return JSONResponse(
                status_code=500,
                content={"error": "Failed to save audio chunk"}
            )
        
        # Transcribe audio (if available)
        transcription_status = "pending"
        if session_data['transcriber'].is_available():
            logger.info(f"🎤 Transcribing audio chunk {len(session_data['segments']) + 1}...")
            transcript_text, segments = session_data['transcriber'].transcribe_audio(audio_path)
            
            if transcript_text:
                # Analyze this segment
                segment_duration = 5.0  # Approximate chunk duration
                if segments:
                    segment_duration = segments[-1]['end'] - segments[0]['start']
                
                # Get timestamp (seconds since recording start)
                chunk_count = len(session_data['segments']) + 1
                timestamp = chunk_count * 5.0  # Approximate
                
                # Analyze speech segment
                analysis_result = session_data['analyzer'].analyze_segment(
                    transcript_text,
                    segment_duration,
                    timestamp
                )
                
                session_data['segments'].append(analysis_result)
                session_data['full_transcript'] += transcript_text + " "
                
                logger.info(f"🎤 ✅ Transcribed chunk {chunk_count}: '{transcript_text[:50]}...'")
                transcription_status = "success"
            else:
                logger.warning(f"🎤 ⚠️ Transcription returned empty for chunk {len(session_data['segments']) + 1}")
                transcription_status = "empty"
        else:
            logger.warning("🎤 ⚠️ Speech transcriber not available (check GOOGLE_APPLICATION_CREDENTIALS)")
            transcription_status = "unavailable"
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "message": "Audio chunk processed",
                "transcription_status": transcription_status,
                "chunks_processed": len(session_data['segments'])
            }
        )
        
    except Exception as e:
        logger.error(f"Error processing audio chunk: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )

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

