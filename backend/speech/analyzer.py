"""
Speech Analysis: Filler words, pace, grammar, dialect
"""

import re
import logging
from typing import Dict, List, Tuple
import google.generativeai as genai
import json
import os

logger = logging.getLogger(__name__)


class SpeechAnalyzer:
    """Analyzes speech quality for presentations"""
    
    def __init__(self):
        # Initialize Gemini for dialect/grammar analysis
        api_key = os.getenv('GEMINI_API_KEY')
        if api_key:
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel('gemini-2.5-flash')
            logger.info("✅ Gemini initialized for speech analysis")
        else:
            self.model = None
            logger.warning("⚠️  GEMINI_API_KEY not set - dialect/grammar analysis disabled")
        
        # Speech scores (0-2.5 each, total 10)
        self.scores = {
            'dialect': 2.5,
            'grammar': 2.5,
            'filler_words': 2.5,
            'pace': 2.5
        }
        
        self.issues = []
    
    def detect_filler_words(self, text: str) -> Tuple[int, List[Dict]]:
        """
        Detect filler words in text
        
        Args:
            text: Transcribed speech text
        
        Returns:
            Tuple of (filler_count, filler_positions)
        """
        filler_patterns = [
            r'\bum\b', r'\buh\b', r'\ber\b', r'\bah\b',
            r'\blike\b', r'\byou know\b', r'\bwell\b',
            r'\bso\b', r'\bactually\b', r'\bbasically\b'
        ]
        
        filler_count = 0
        filler_positions = []
        
        text_lower = text.lower()
        for pattern in filler_patterns:
            matches = list(re.finditer(pattern, text_lower))
            filler_count += len(matches)
            for match in matches:
                filler_positions.append({
                    'word': match.group(),
                    'position': match.start()
                })
        
        return filler_count, filler_positions
    
    def calculate_pace(self, text: str, duration_seconds: float) -> Tuple[float, str, float]:
        """
        Calculate words per minute
        
        Args:
            text: Transcribed speech text
            duration_seconds: Duration of speech segment
        
        Returns:
            Tuple of (wpm, pace_status, deviation)
            pace_status: 'too_slow' | 'good' | 'too_fast'
        """
        if duration_seconds <= 0:
            return 0, 'good', 0
        
        words = text.split()
        word_count = len(words)
        wpm = (word_count / duration_seconds) * 60
        
        # Ideal pace: 150-180 WPM
        ideal_min = 150
        ideal_max = 180
        
        if wpm < ideal_min:
            deviation = ideal_min - wpm
            return wpm, 'too_slow', deviation
        elif wpm > ideal_max:
            deviation = wpm - ideal_max
            return wpm, 'too_fast', deviation
        else:
            return wpm, 'good', 0
    
    def analyze_with_gemini(self, transcript_text: str) -> Dict:
        """
        Use Gemini to analyze dialect/pronunciation and grammar
        
        Args:
            transcript_text: Full transcription text
        
        Returns:
            Dict with dialect_score, grammar_score, and issues
        """
        if not self.model:
            return {
                'dialect_score': 2.5,
                'grammar_score': 2.5,
                'dialect_issues': [],
                'grammar_issues': [],
                'dialect_feedback': 'Analysis unavailable - Gemini not configured',
                'grammar_feedback': 'Analysis unavailable - Gemini not configured'
            }
        
        prompt = f"""Analyze this speech transcript for presentation quality. Evaluate:

1. **Dialect/Pronunciation** - Assess clarity, articulation, pronunciation accuracy, and speech intelligibility
2. **Grammar** - Identify grammatical errors, incorrect word usage, sentence structure issues

Provide your response as JSON:
{{
  "dialect_score": <0-2.5>,
  "grammar_score": <0-2.5>,
  "dialect_issues": [
    {{"issue": "specific pronunciation or clarity problem", "severity": "high|medium|low"}}
  ],
  "grammar_issues": [
    {{"issue": "specific grammatical error", "severity": "high|medium|low"}}
  ],
  "dialect_feedback": "overall assessment of pronunciation and clarity",
  "grammar_feedback": "overall assessment of grammar"
}}

Transcript: "{transcript_text}"

Focus on SPECIFIC, ACTIONABLE issues. Only mention problems that actually exist."""
        
        try:
            response = self.model.generate_content(prompt)
            text = response.text.strip()
            
            # Parse JSON response
            if '```json' in text:
                text = text.split('```json')[1].split('```')[0].strip()
            elif '```' in text:
                text = text.split('```')[1].split('```')[0].strip()
            
            analysis = json.loads(text)
            return analysis
            
        except Exception as e:
            logger.error(f"Gemini speech analysis error: {e}")
            return {
                'dialect_score': 2.5,
                'grammar_score': 2.5,
                'dialect_issues': [],
                'grammar_issues': [],
                'dialect_feedback': 'Analysis failed',
                'grammar_feedback': 'Analysis failed'
            }
    
    def analyze_segment(self, transcript_text: str, duration_seconds: float, timestamp: float) -> Dict:
        """
        Analyze a speech segment
        
        Args:
            transcript_text: Transcribed text for this segment
            duration_seconds: Duration of segment
            timestamp: Timestamp in recording
        
        Returns:
            Dict with analysis results
        """
        results = {
            'timestamp': timestamp,
            'text': transcript_text,
            'duration': duration_seconds,
            'issues': []
        }
        
        # Analyze filler words
        filler_count, filler_positions = self.detect_filler_words(transcript_text)
        word_count = len(transcript_text.split())
        
        if word_count > 0:
            filler_ratio = filler_count / word_count
            
            # Deduct points for excessive filler words (>5% is problematic)
            if filler_ratio > 0.05:
                deduction = min(0.5, (filler_ratio - 0.05) * 10)
                self.scores['filler_words'] = max(0, self.scores['filler_words'] - deduction)
                
                results['issues'].append({
                    'category': 'filler_words',
                    'issue': f"Excessive filler words: {filler_count} filler words in {word_count} words ({filler_ratio*100:.1f}%)",
                    'severity': 'high' if filler_ratio > 0.10 else 'medium',
                    'score_deduction': deduction,
                    'suggestion': 'Practice pausing instead of using filler words. Take a breath when you need to think.'
                })
        
        # Analyze pace
        wpm, pace_status, deviation = self.calculate_pace(transcript_text, duration_seconds)
        
        if pace_status != 'good':
            deduction = min(0.5, deviation / 50)  # Deduct based on deviation
            self.scores['pace'] = max(0, self.scores['pace'] - deduction)
            
            if pace_status == 'too_slow':
                suggestion = f"Increase speaking pace. Currently {wpm:.0f} WPM, aim for 150-180 WPM."
            else:
                suggestion = f"Slow down your pace. Currently {wpm:.0f} WPM, aim for 150-180 WPM."
            
            results['issues'].append({
                'category': 'pace',
                'issue': f"Speaking {'too slowly' if pace_status == 'too_slow' else 'too quickly'}: {wpm:.0f} WPM",
                'severity': 'high' if deviation > 30 else 'medium',
                'score_deduction': deduction,
                'suggestion': suggestion
            })
        
        results['filler_count'] = filler_count
        results['wpm'] = wpm
        results['pace_status'] = pace_status
        
        return results
    
    def finalize(self, full_transcript: str) -> Dict:
        """
        Perform final analysis on full transcript
        
        Args:
            full_transcript: Complete transcription text
        
        Returns:
            Dict with final scores and comprehensive analysis
        """
        # Analyze dialect and grammar with Gemini
        gemini_analysis = self.analyze_with_gemini(full_transcript)
        
        # Update scores
        self.scores['dialect'] = gemini_analysis.get('dialect_score', 2.5)
        self.scores['grammar'] = gemini_analysis.get('grammar_score', 2.5)
        
        # Add dialect issues
        for issue in gemini_analysis.get('dialect_issues', []):
            self.issues.append({
                'category': 'dialect',
                'issue': issue['issue'],
                'severity': issue['severity'],
                'suggestion': 'Practice clear articulation and pronunciation'
            })
        
        # Add grammar issues
        for issue in gemini_analysis.get('grammar_issues', []):
            self.issues.append({
                'category': 'grammar',
                'issue': issue['issue'],
                'severity': issue['severity'],
                'suggestion': 'Review grammar rules and practice correct sentence structure'
            })
        
        # Calculate total oral presentation score (out of 10)
        oral_score = sum(self.scores.values())
        
        return {
            'oral_presentation_score': oral_score,
            'scores': self.scores,
            'issues': self.issues,
            'dialect_feedback': gemini_analysis.get('dialect_feedback', ''),
            'grammar_feedback': gemini_analysis.get('grammar_feedback', '')
        }

