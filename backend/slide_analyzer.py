"""
Slide Content Analyzer
Analyzes presentation slides/boards using Gemini AI
Ported from Kyle's Flask app for integration with body language analysis
"""

import google.generativeai as genai
import os
from dotenv import load_dotenv
from pathlib import Path
from PIL import Image
import io
import json
from typing import Dict, List, Optional, Tuple
import logging

# Load environment variables from multiple locations (same as coaching.py)
BACKEND_DIR = Path(__file__).resolve().parent
load_dotenv(BACKEND_DIR / ".env")
load_dotenv(BACKEND_DIR.parent / ".env")
load_dotenv(BACKEND_DIR.parent / ".env.local")

logger = logging.getLogger(__name__)

# Configure Gemini
try:
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        logger.warning("⚠️  GEMINI_API_KEY not found in environment")
        logger.warning("    Checked: backend/.env, .env, .env.local")
    else:
        genai.configure(api_key=api_key)
        logger.info("✅ Gemini configured for slide analysis")
except Exception as e:
    logger.error(f"Failed to configure Gemini: {e}")

SLIDE_ANALYSIS_PROMPT = """Analyze this presentation slide/board for effectiveness. Evaluate:

1. **Text Clarity** - Readable font size, clear hierarchy, not too much text (6x6 rule: max 6 words per line, 6 lines)
2. **Visual Design** - Color psychology, contrast (4.5:1 minimum), visual hierarchy, white space
3. **Content Quality** - Message clarity, coherence, audience appropriateness
4. **Overall Impact** - Persuasiveness, memorability, professional quality

Provide your response as JSON:
{
  "overall_score": <0-10>,
  "issues": [
    {"category": "Text Clarity|Visual Design|Content Quality|Overall Impact", "issue": "specific problem description", "severity": "critical|high|medium|low", "suggestion": "how to fix it"}
  ],
  "summary": "brief 2-3 sentence analysis"
}

Focus on identifying SPECIFIC, ACTIONABLE issues. Only mention problems that actually exist."""


class SlideAnalyzer:
    """Analyzes presentation slides using Gemini AI"""
    
    def __init__(self, model_name: str = 'gemini-2.5-flash'):
        """Initialize the slide analyzer
        
        Args:
            model_name: Gemini model to use for analysis
        """
        try:
            # Ensure Gemini is configured with API key
            api_key = os.getenv('GEMINI_API_KEY')
            if not api_key:
                logger.error("❌ GEMINI_API_KEY not found - slide analysis will be disabled")
                self.model = None
                return
            
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel(model_name)
            logger.info(f"✅ Slide analyzer initialized with model: {model_name}")
        except Exception as e:
            logger.error(f"❌ Failed to initialize Gemini model: {e}")
            self.model = None
    
    def is_configured(self) -> bool:
        """Check if Gemini model is configured and ready"""
        return self.model is not None
    
    def analyze_frame(self, image_data: bytes) -> Dict:
        """Analyze a single frame/slide
        
        Args:
            image_data: Raw image bytes (JPEG/PNG)
            
        Returns:
            Dict containing:
                - overall_score: int (0-10)
                - issues: List of detected issues
                - summary: str
                - error: str (if analysis failed)
        """
        if not self.model:
            return {
                'error': 'Gemini model not initialized',
                'overall_score': 0,
                'issues': [],
                'summary': 'Analysis unavailable - Gemini not configured'
            }
        
        try:
            # Open image
            img = Image.open(io.BytesIO(image_data))
            
            # Call Gemini
            response = self.model.generate_content([SLIDE_ANALYSIS_PROMPT, img])
            text = response.text.strip()
            
            # Parse JSON response (handle code blocks)
            if '```json' in text:
                text = text.split('```json')[1].split('```')[0].strip()
            elif '```' in text:
                text = text.split('```')[1].split('```')[0].strip()
            
            analysis = json.loads(text)
            
            return {
                'overall_score': analysis.get('overall_score', 5),
                'issues': analysis.get('issues', []),
                'summary': analysis.get('summary', ''),
                'success': True
            }
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Gemini response: {e}")
            logger.error(f"Raw response: {text}")
            return {
                'error': f'Failed to parse response: {str(e)}',
                'overall_score': 0,
                'issues': [],
                'summary': 'Analysis failed - invalid response format',
                'success': False
            }
        except Exception as e:
            logger.error(f"Slide analysis error: {e}")
            return {
                'error': str(e),
                'overall_score': 0,
                'issues': [],
                'summary': f'Analysis failed: {str(e)}',
                'success': False
            }
    
    def detect_new_issues(
        self, 
        current_issues: List[Dict], 
        seen_fingerprints: set
    ) -> Tuple[List[Dict], set]:
        """Filter out duplicate issues based on fingerprints
        
        Args:
            current_issues: List of issues from latest analysis
            seen_fingerprints: Set of previously seen issue fingerprints
            
        Returns:
            Tuple of (new_issues, updated_fingerprints)
        """
        new_issues = []
        updated_fingerprints = seen_fingerprints.copy()
        
        for issue in current_issues:
            # Create fingerprint: category + first 50 chars of issue
            fingerprint = f"{issue.get('category', 'unknown')}:{issue.get('issue', '')[:50]}"
            
            if fingerprint not in updated_fingerprints:
                updated_fingerprints.add(fingerprint)
                new_issues.append(issue)
        
        return new_issues, updated_fingerprints
    
    @staticmethod
    def format_timestamp(seconds: float) -> str:
        """Format seconds as MM:SS"""
        mins = int(seconds // 60)
        secs = int(seconds % 60)
        return f"{mins:02d}:{secs:02d}"


# Singleton instance
_slide_analyzer: Optional[SlideAnalyzer] = None

def get_slide_analyzer() -> SlideAnalyzer:
    """Get or create the global slide analyzer instance"""
    global _slide_analyzer
    if _slide_analyzer is None:
        _slide_analyzer = SlideAnalyzer()
    return _slide_analyzer

