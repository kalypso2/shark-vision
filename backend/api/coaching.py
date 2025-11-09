"""
Gemini Coaching API - RAG-Enhanced
Generates personalized feedback using research context
"""

import os
from pathlib import Path
from typing import Dict
import google.generativeai as genai
import logging
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# Load environment variables for Gemini
BACKEND_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_DIR / ".env")
load_dotenv(BACKEND_DIR.parent / ".env")
load_dotenv(BACKEND_DIR.parent / ".env.local")

# Initialize Gemini
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)


async def generate_coaching(analysis: Dict, rag_context: str) -> str:
    """
    Generate AI coaching feedback with RAG context
    
    Args:
        analysis: Full analysis dict
        rag_context: Formatted research context from RAG system
    
    Returns:
        Coaching feedback string
    """
    if not GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY not set, returning fallback")
        return _fallback_coaching(analysis)
    
    try:
        # Build prompt with RAG context
        prompt = _build_coaching_prompt(analysis, rag_context)
        
        # Generate with Gemini
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(prompt)
        
        return response.text
    
    except Exception as e:
        logger.error(f"Error generating coaching: {e}", exc_info=True)
        return _fallback_coaching(analysis)


def _build_coaching_prompt(analysis: Dict, rag_context: str) -> str:
    """Build the prompt for Gemini with RAG context"""
    aggregates = analysis.get('aggregates', {})
    timeline = analysis.get('timeline', [])
    session_meta = analysis.get('session_meta', {})
    
    # Get key events
    posture_events = [e for e in timeline if e['type'] == 'posture'][:3]
    gesture_events = [e for e in timeline if e['type'] == 'gesture'][:3]
    gaze_events = [e for e in timeline if e['type'] == 'gaze'][:3]
    facial_events = [e for e in timeline if e['type'] == 'facial'][:3]
    
    return f"""You are an expert presentation coach with access to research-backed body language data. Analyze this presentation using evidence-based benchmarks and provide specific, grounded feedback.

{rag_context}

**Analysis Data:**

**Session Overview:**
- Duration: {session_meta.get('duration_seconds', 0):.0f}s
- Frames analyzed: {session_meta.get('total_frames', 0)}
- Landmarks per frame: 543 (MediaPipe Holistic: pose + face + hands)

**Aggregate Scores:**
- Posture: {aggregates.get('posture_score', 0):.0f}/100
- Eye Contact: {aggregates.get('eye_contact_proxy', 0):.0f}/100
- Gesture Quality: {aggregates.get('gesture_quality', 0):.0f}/100
- Gesture Frequency: {aggregates.get('gesture_frequency', 0):.1f} per minute
- Engagement: {aggregates.get('engagement_score', 0):.0f}/100
- Smile Frequency: {aggregates.get('smile_frequency', 0):.1f} per minute

**Notable Events:**
{f"Posture: {len(posture_events)} events" if posture_events else ""}
{f"Gestures: {len(gesture_events)} events" if gesture_events else ""}
{f"Gaze: {len(gaze_events)} events" if gaze_events else ""}
{f"Facial: {len(facial_events)} events (smiling detected)" if facial_events else ""}

**Instructions:**
Provide evidence-based feedback in this format:

**Strengths:**
1. [Specific strength with comparison to research benchmark - cite source]
2. [Another strength with data]
3. [Third strength]

**Areas to Improve:**
1. [Specific improvement with research context and timestamp if relevant]
2. [Another improvement with benchmark comparison]
3. [Third improvement]

**Evidence-Based Technique:**
[One research-backed technique from the provided context that addresses their biggest weakness. Include the source citation.]

Keep it under 200 words total. Ground all feedback in the research provided. Be specific with numbers and comparisons. Cite sources in parentheses."""


def _fallback_coaching(analysis: Dict) -> str:
    """Fallback coaching when Gemini API is unavailable"""
    aggregates = analysis.get('aggregates', {})
    
    return f"""**Analysis Complete**

Your presentation has been analyzed with 543 landmarks per frame.

**Scores:**
- Posture: {aggregates.get('posture_score', 0):.0f}/100
- Eye Contact: {aggregates.get('eye_contact_proxy', 0):.0f}/100
- Gesture Quality: {aggregates.get('gesture_quality', 0):.0f}/100
- Engagement: {aggregates.get('engagement_score', 0):.0f}/100

To receive AI-powered coaching feedback, please set your GEMINI_API_KEY environment variable.
"""


def format_time(seconds: float) -> str:
    """Format timestamp as MM:SS"""
    mins = int(seconds // 60)
    secs = int(seconds % 60)
    return f"{mins}:{secs:02d}"

