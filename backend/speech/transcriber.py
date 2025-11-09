"""
Speech-to-Text Transcription using Google Cloud Speech API
"""

import os
import logging
from typing import Optional, List, Dict, Tuple
from pathlib import Path

logger = logging.getLogger(__name__)

# Try to import Google Cloud Speech
try:
    from google.cloud import speech
    SPEECH_AVAILABLE = True
except ImportError:
    SPEECH_AVAILABLE = False
    logger.warning("google-cloud-speech not installed. Speech analysis will be disabled.")


class SpeechTranscriber:
    """Handles speech-to-text transcription using Google Cloud Speech API"""
    
    def __init__(self):
        self.client = None
        self._initialize_client()
    
    def _initialize_client(self):
        """Initialize Google Speech-to-Text client"""
        if not SPEECH_AVAILABLE:
            logger.warning("⚠️  Google Cloud Speech not available")
            return
        
        try:
            # Read credentials path from environment
            creds_path = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
            
            if not creds_path:
                logger.warning("⚠️  GOOGLE_APPLICATION_CREDENTIALS not set in environment")
                logger.warning("    Add to .env: GOOGLE_APPLICATION_CREDENTIALS=./path/to/credentials.json")
                return
            
            # Convert to absolute path if needed
            if not os.path.isabs(creds_path):
                backend_dir = Path(__file__).resolve().parent.parent
                creds_path = str(backend_dir / creds_path)
            
            # Verify file exists
            if not os.path.exists(creds_path):
                logger.error(f"❌ Credentials file not found: {creds_path}")
                return
            
            # Set environment variable (Google Cloud library reads this)
            os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = creds_path
            
            # Initialize client
            self.client = speech.SpeechClient()
            logger.info(f"✅ Google Speech-to-Text initialized: {Path(creds_path).name}")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize Speech-to-Text: {e}")
            self.client = None
    
    def is_available(self) -> bool:
        """Check if speech-to-text is available"""
        return self.client is not None
    
    def transcribe_audio(self, audio_path: str) -> Tuple[Optional[str], Optional[List[Dict]]]:
        """
        Transcribe audio file to text with word timestamps
        
        Args:
            audio_path: Path to audio file (WebM/Opus format)
        
        Returns:
            Tuple of (transcript_text, segments)
            segments = [{'start': float, 'end': float, 'text': str}, ...]
        """
        if not self.is_available():
            logger.warning("🎤 ⚠️ Transcriber not available")
            return None, None
        
        try:
            # Read audio file
            with open(audio_path, 'rb') as audio_file:
                content = audio_file.read()
            
            file_size_kb = len(content) / 1024
            logger.info(f"🎤 Audio file: {Path(audio_path).name}, size: {file_size_kb:.1f} KB")
            
            if len(content) < 1024:  # Less than 1KB
                logger.warning(f"🎤 ⚠️ Audio file too small ({len(content)} bytes), likely no speech")
                return None, None
            
            audio = speech.RecognitionAudio(content=content)
            
            # Configure recognition for WebM Opus chunks from MediaRecorder
            suffix = Path(audio_path).suffix.lower()
            if suffix in {'.ogg', '.oga', '.opus'}:
                encoding = speech.RecognitionConfig.AudioEncoding.OGG_OPUS
            elif suffix == '.webm':
                encoding = speech.RecognitionConfig.AudioEncoding.WEBM_OPUS
            else:
                encoding = speech.RecognitionConfig.AudioEncoding.ENCODING_UNSPECIFIED
                logger.warning(f"🎤 ⚠️ Unknown audio extension '{suffix}', falling back to auto encoding")

            config = speech.RecognitionConfig(
                encoding=encoding,
                language_code='en-US',
                enable_word_time_offsets=True,
                enable_automatic_punctuation=True,
            )

            logger.info(f"🎤 Sending {file_size_kb:.1f}KB to Google Speech-to-Text ({suffix or 'no extension'})...")

            # Perform recognition
            response = self.client.recognize(config=config, audio=audio)

            logger.info(f"🎤 Response received: {len(response.results)} result(s)")

            if not response.results:
                logger.warning("🎤 ⚠️ No speech detected in audio chunk")
                return None, None

            transcript_text = ''
            segments = []
            
            for i, result in enumerate(response.results):
                alt_text = result.alternatives[0].transcript
                transcript_text += alt_text + ' '
                logger.info(f"🎤 Result {i+1}: '{alt_text}'")
                
                # Extract word timestamps
                if result.alternatives[0].words:
                    start_time = result.alternatives[0].words[0].start_time.total_seconds()
                    end_time = result.alternatives[0].words[-1].end_time.total_seconds()
                    segments.append({
                        'start': start_time,
                        'end': end_time,
                        'text': alt_text
                    })
            
            return transcript_text.strip(), segments
            
        except Exception as e:
            logger.error(f"🎤 ❌ Transcription error for {Path(audio_path).name}: {e}", exc_info=True)
            return None, None

