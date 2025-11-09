"""
Debug Logger for Body Language Analysis
Provides detailed, timestamped breakdown of scoring
"""

import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List
import numpy as np
from numbers import Number

class AnalysisDebugLogger:
    """Logs detailed analysis data for debugging"""
    
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.frame_logs = []
        self.scoring_breakdown = {
            'posture': [],
            'engagement': [],
            'gesture': [],
            'gaze': [],
            'facial': []
        }
    
    def log_frame(self, timestamp: float, frame_num: int, metrics: Dict):
        """Log detailed metrics for a single frame"""
        log_entry = {
            'timestamp': timestamp,
            'frame': frame_num,
            'metrics': metrics,
            'scoring_details': self._calculate_scoring_details(metrics)
        }
        self.frame_logs.append(log_entry)
        
        # Add to scoring breakdown
        self._update_scoring_breakdown(timestamp, metrics)
    
    def _calculate_scoring_details(self, metrics: Dict) -> Dict:
        """Calculate detailed scoring information"""
        details = {}
        
        # Posture details
        if 'posture' in metrics:
            posture = metrics['posture']
            details['posture'] = {
                'score': posture['score'],
                'contributing_factors': {
                    'shoulder_alignment': posture['shoulder_alignment'],
                    'spine_quality': posture['spine_quality']
                },
                'penalties': self._calculate_posture_penalties(posture)
            }
        
        # Engagement details (CRITICAL for debugging)
        if 'movement' in metrics:
            movement = metrics['movement']
            details['engagement'] = {
                'movement_amount': movement['amount'],
                'movement_type': movement['type'],
                'thresholds': {
                    'static_threshold': 0.003,  # Updated to match new system
                    'dynamic_threshold': 0.010   # Updated to match new system
                },
                'status': self._get_engagement_status(movement['amount']),
                'contributing_to_score': movement['amount'] > 0.003  # Updated threshold
            }
        
        # Gesture details
        if 'gesture' in metrics:
            gesture = metrics['gesture']
            details['gesture'] = {
                'movement': gesture['movement'],
                'symmetry': gesture['symmetry'],
                'quality': gesture['quality'],
                'threshold': 0.03,
                'is_gesture': gesture['movement'] > 0.03
            }
        
        # Gaze details
        if 'gaze' in metrics:
            gaze = metrics['gaze']
            details['gaze'] = {
                'direction': gaze['direction'],
                'is_forward': gaze['is_forward'],
                'method': gaze.get('method', 'unknown')
            }
        
        # Facial details (Python only)
        if 'facial' in metrics:
            facial = metrics['facial']
            details['facial'] = {
                'smile': facial.get('smile', 0),
                'eyebrow_raise': facial.get('eyebrow_raise', 0),
                'mouth_open': facial.get('mouth_open', 0)
            }
        
        return details
    
    def _calculate_posture_penalties(self, posture: Dict) -> List[str]:
        """Calculate why posture lost points"""
        penalties = []
        
        if posture['shoulder_alignment'] < 0.7:
            penalties.append(f"Shoulders not level (alignment: {posture['shoulder_alignment']:.2f})")
        
        if posture['spine_quality'] < 0.7:
            penalties.append(f"Spine not straight (quality: {posture['spine_quality']:.2f})")
        
        if not posture['is_good']:
            penalties.append("Overall posture below threshold")
        
        return penalties
    
    def _get_engagement_status(self, movement_amount: float) -> str:
        """Get human-readable engagement status"""
        if movement_amount < 0.003:
            return f"STATIC - Below threshold (need 0.003, got {movement_amount:.6f})"
        elif movement_amount < 0.010:
            return f"MODERATE - Above static but below dynamic ({movement_amount:.6f})"
        else:
            return f"DYNAMIC - Engaged! ({movement_amount:.6f})"
    
    def _update_scoring_breakdown(self, timestamp: float, metrics: Dict):
        """Update per-metric breakdown"""
        
        # Engagement breakdown (FACIAL + MOVEMENT)
        engagement_data = {}
        
        if 'facial' in metrics:
            facial = metrics['facial']
            engagement_data['smile'] = facial.get('smile', 0)
            engagement_data['eyebrow_raise'] = facial.get('eyebrow_raise', 0)
            engagement_data['mouth_open'] = facial.get('mouth_open', 0)
            # Calculate facial engagement score
            facial_score = (
                facial.get('smile', 0) * 40 +
                facial.get('eyebrow_raise', 0) * 30 +
                facial.get('mouth_open', 0) * 30
            )
            engagement_data['facial_score'] = min(100, facial_score)
        
        if 'movement' in metrics:
            movement = metrics['movement']
            engagement_data['movement_amount'] = movement['amount']
            engagement_data['type'] = movement['type']
            
            # Calculate movement score
            mov_amt = movement['amount']
            if 0.003 <= mov_amt <= 0.010:
                movement_score = 100
            elif mov_amt < 0.003:
                movement_score = (mov_amt / 0.003) * 100
            else:
                movement_score = max(0, 100 - ((mov_amt - 0.010) * 1000))
            engagement_data['movement_score'] = movement_score
        
        # Overall engagement (70% facial, 30% movement)
        if 'facial_score' in engagement_data and 'movement_score' in engagement_data:
            engagement_data['total_score'] = (
                engagement_data['facial_score'] * 0.70 +
                engagement_data['movement_score'] * 0.30
            )
        
        engagement_data['timestamp'] = timestamp
        self.scoring_breakdown['engagement'].append(engagement_data)
        
        # Posture breakdown
        if 'posture' in metrics:
            posture = metrics['posture']
            self.scoring_breakdown['posture'].append({
                'timestamp': timestamp,
                'score': posture['score'],
                'is_good': posture['is_good'],
                'penalties': self._calculate_posture_penalties(posture)
            })
        
        # Gesture breakdown
        if 'gesture' in metrics:
            gesture = metrics['gesture']
            self.scoring_breakdown['gesture'].append({
                'timestamp': timestamp,
                'movement': gesture['movement'],
                'quality': gesture['quality'],
                'is_gesture': gesture['movement'] > 0.03
            })
        
        # Gaze breakdown
        if 'gaze' in metrics:
            gaze = metrics['gaze']
            self.scoring_breakdown['gaze'].append({
                'timestamp': timestamp,
                'direction': gaze['direction'],
                'is_forward': gaze['is_forward']
            })
        
        # Facial breakdown
        if 'facial' in metrics:
            facial = metrics['facial']
            self.scoring_breakdown['facial'].append({
                'timestamp': timestamp,
                'smile': facial.get('smile', 0),
                'eyebrow_raise': facial.get('eyebrow_raise', 0)
            })
    
    def generate_report(self) -> Dict:
        """Generate detailed debug report"""
        
        # Analyze engagement issues
        engagement_analysis = self._analyze_engagement_issues()
        
        # Find problem periods
        problem_periods = self._find_problem_periods()
        
        # Calculate what hurt the scores
        score_factors = self._calculate_score_factors()
        
        return {
            'session_id': self.session_id,
            'total_frames': len(self.frame_logs),
            'engagement_analysis': engagement_analysis,
            'problem_periods': problem_periods,
            'score_factors': score_factors,
            'scoring_breakdown': self.scoring_breakdown,
            'recommendations': self._generate_recommendations(engagement_analysis)
        }
    
    def _analyze_engagement_issues(self) -> Dict:
        """Deep dive into why engagement is low (FACIAL + MOVEMENT)"""
        engagement_data = self.scoring_breakdown['engagement']
        
        if not engagement_data:
            return {'error': 'No engagement data recorded'}
        
        total_frames = len(engagement_data)
        
        # Analyze FACIAL engagement
        facial_frames = [e for e in engagement_data if 'facial_score' in e]
        if facial_frames:
            avg_facial = np.mean([e['facial_score'] for e in facial_frames])
            avg_smile = np.mean([e.get('smile', 0) for e in facial_frames])
            avg_eyebrow = np.mean([e.get('eyebrow_raise', 0) for e in facial_frames])
            avg_mouth = np.mean([e.get('mouth_open', 0) for e in facial_frames])
        else:
            avg_facial = 0
            avg_smile = avg_eyebrow = avg_mouth = 0
        
        # Analyze MOVEMENT engagement
        movement_frames = [e for e in engagement_data if 'movement_amount' in e]
        if movement_frames:
            static_frames = sum(1 for e in movement_frames if e['movement_amount'] < 0.003)
            moderate_frames = sum(1 for e in movement_frames if 0.003 <= e['movement_amount'] < 0.010)
            dynamic_frames = sum(1 for e in movement_frames if e['movement_amount'] >= 0.010)
        else:
            static_frames = moderate_frames = dynamic_frames = 0
        
        # Find specific low-engagement periods
        low_engagement_periods = []
        current_period_start = None
        
        for entry in engagement_data:
            is_low = False
            
            # Low if BOTH facial AND movement are low
            if 'total_score' in entry and entry['total_score'] < 50:
                is_low = True
            
            if is_low:
                if current_period_start is None:
                    current_period_start = entry['timestamp']
            else:
                if current_period_start is not None:
                    low_engagement_periods.append({
                        'start': current_period_start,
                        'end': entry['timestamp'],
                        'duration': entry['timestamp'] - current_period_start
                    })
                    current_period_start = None
        
        # Average values
        if movement_frames:
            avg_movement = sum(e['movement_amount'] for e in movement_frames) / len(movement_frames)
            max_movement = max(e['movement_amount'] for e in movement_frames)
            min_movement = min(e['movement_amount'] for e in movement_frames)
        else:
            avg_movement = max_movement = min_movement = 0
        
        return {
            'total_frames': total_frames,
            'facial_analysis': {
                'average_score': avg_facial,
                'smile_average': avg_smile,
                'eyebrow_raise_average': avg_eyebrow,
                'mouth_movement_average': avg_mouth,
                'contributing_to_score': '70% of engagement'
            },
            'movement_analysis': {
                'frame_distribution': {
                    'static': static_frames,
                    'moderate': moderate_frames,
                    'dynamic': dynamic_frames
                },
                'percentages': {
                    'static': (static_frames / len(movement_frames) * 100) if movement_frames else 0,
                    'moderate': (moderate_frames / len(movement_frames) * 100) if movement_frames else 0,
                    'dynamic': (dynamic_frames / len(movement_frames) * 100) if movement_frames else 0
                },
                'stats': {
                    'average': avg_movement,
                    'max': max_movement,
                    'min': min_movement,
                    'threshold_needed': 0.003,
                    'gap': max(0, 0.003 - avg_movement)
                },
                'contributing_to_score': '30% of engagement'
            },
            'low_engagement_periods': low_engagement_periods,
            'diagnosis': self._diagnose_engagement_issue_comprehensive(
                avg_facial, avg_smile, avg_movement, total_frames
            )
        }
    
    def _diagnose_engagement_issue_comprehensive(
        self, avg_facial: float, avg_smile: float, avg_movement: float, total_frames: int
    ) -> str:
        """Diagnose why engagement is low (FACIAL-FOCUSED)"""
        
        # Facial is 70% of score, so it's the primary issue if low
        if avg_facial < 30:
            if avg_smile < 0.2:
                return "LOW ENGAGEMENT: Very little smiling detected (70% of score). Try smiling more, showing enthusiasm, and being more expressive with your face."
            else:
                return "LOW ENGAGEMENT: Limited facial expressiveness. Try raising eyebrows when emphasizing points and being more animated."
        elif avg_facial < 50:
            return "MODERATE ENGAGEMENT: Some facial expression detected but could be more animated. Smile more and use eyebrows for emphasis."
        elif avg_movement < 0.002:
            return "Good facial engagement but minimal body movement (30% of score). Add subtle torso shifts for even higher scores."
        else:
            return "Good engagement! Both facial expressions and movement are working well."
    
    def _find_problem_periods(self) -> List[Dict]:
        """Find specific timestamps where scoring issues occurred"""
        problems = []
        
        # Find extended static periods
        engagement_data = self.scoring_breakdown['engagement']
        static_count = 0
        static_start = None
        
        for entry in engagement_data:
            if entry.get('movement_amount', 0) < 0.006:
                if static_start is None:
                    static_start = entry['timestamp']
                static_count += 1
            else:
                if static_count > 30:  # 3+ seconds static (at 10fps)
                    problems.append({
                        'type': 'extended_static_period',
                        'start_time': static_start,
                        'end_time': entry['timestamp'],
                        'duration': entry['timestamp'] - static_start,
                        'severity': 'high' if static_count > 50 else 'medium'
                    })
                static_count = 0
                static_start = None
        
        # Find poor posture periods
        posture_data = self.scoring_breakdown['posture']
        for entry in posture_data:
            if entry['score'] < 55 and entry['penalties']:  # Was 60, now 55 to match relaxed system
                problems.append({
                    'type': 'poor_posture',
                    'timestamp': entry['timestamp'],
                    'score': entry['score'],
                    'issues': entry['penalties']
                })
        
        return problems
    
    def _calculate_score_factors(self) -> Dict:
        """Calculate what contributed to each score"""
        
        engagement_data = self.scoring_breakdown['engagement']
        posture_data = self.scoring_breakdown['posture']
        
        # Engagement factors (derive 'scored' from total_score >= 50 if not provided)
        if engagement_data:
            total_frames = len(engagement_data)
            scored_frames = sum(1 for e in engagement_data if e.get('total_score', 0) >= 50)
            engagement_factors = {
                'frames_that_scored': scored_frames,
                'frames_that_didnt_score': total_frames - scored_frames,
                'percentage_scoring': (scored_frames / total_frames * 100) if total_frames > 0 else 0,
                'why_frames_didnt_score': [
                    f"{e.get('timestamp', 0):.1f}s: low engagement"
                    for e in engagement_data[:10] if e.get('total_score', 0) < 50
                ]
            }
        else:
            engagement_factors = {'error': 'No engagement data'}
        
        # Posture factors
        if posture_data:
            good_frames = sum(1 for p in posture_data if p['is_good'])
            total_frames = len(posture_data)
            avg_score = sum(p['score'] for p in posture_data) / total_frames
            
            posture_factors = {
                'average_score': avg_score,
                'good_posture_percentage': (good_frames / total_frames * 100) if total_frames > 0 else 0,
                'common_issues': self._find_common_posture_issues(posture_data)
            }
        else:
            posture_factors = {'error': 'No posture data'}
        
        return {
            'engagement': engagement_factors,
            'posture': posture_factors
        }
    
    def _find_common_posture_issues(self, posture_data: List[Dict]) -> List[str]:
        """Find most common posture problems"""
        all_penalties = []
        for entry in posture_data:
            all_penalties.extend(entry.get('penalties', []))
        
        # Count frequency
        from collections import Counter
        penalty_counts = Counter(all_penalties)
        
        return [f"{penalty} ({count} times)" for penalty, count in penalty_counts.most_common(3)]
    
    def _generate_recommendations(self, engagement_analysis: Dict) -> List[str]:
        """Generate specific recommendations (FACIAL-FOCUSED)"""
        recommendations = []
        
        # Facial recommendations (70% of score - MOST IMPORTANT)
        if 'facial_analysis' in engagement_analysis:
            facial = engagement_analysis['facial_analysis']
            avg_facial = facial['average_score']
            avg_smile = facial['smile_average']
            avg_eyebrow = facial['eyebrow_raise_average']
            
            if avg_facial < 30:
                recommendations.append(
                    "🔴 CRITICAL: Low facial engagement (70% of your score!)"
                )
                if avg_smile < 0.2:
                    recommendations.append(
                        "😊 SMILE MORE: Detected very little smiling. Try to smile naturally and show enthusiasm."
                    )
                if avg_eyebrow < 0.2:
                    recommendations.append(
                        "🤨 BE MORE EXPRESSIVE: Raise eyebrows when emphasizing points. Show enthusiasm with your face."
                    )
                recommendations.append(
                    "💡 Key: Your FACIAL EXPRESSIONS are 70% of engagement. Body movement is only 30%."
                )
            elif avg_facial < 50:
                recommendations.append(
                    "⚠️ Moderate facial engagement. Could be more animated."
                )
                recommendations.append(
                    "💡 Try: Smile more frequently, use eyebrows for emphasis, show emotion."
                )
        
        # Movement recommendations (30% of score - secondary)
        if 'movement_analysis' in engagement_analysis:
            movement = engagement_analysis['movement_analysis']
            if 'stats' in movement:
                avg_movement = movement['stats']['average']
                
                if avg_movement < 0.002:
                    recommendations.append(
                        "⚠️ Minimal body movement (30% of score). Add subtle torso shifts for a small boost."
                    )
            
            # Check for static periods
            if engagement_analysis.get('low_engagement_periods'):
                num_periods = len(engagement_analysis['low_engagement_periods'])
                recommendations.append(
                    f"⚠️ Found {num_periods} low-engagement periods. Maintain consistent energy."
                )
        
        return recommendations
    
    def save_report(self, output_dir: str = "../storage/debug"):
        """Save detailed report to file"""
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        
        report = self.generate_report()
        report = self._to_serializable(report)
        
        filename = output_path / f"{self.session_id}_debug.json"
        with open(filename, 'w') as f:
            json.dump(report, f, indent=2)
        
        return str(filename)

    def _to_serializable(self, obj):
        """
        Recursively convert numpy types (np.bool_, np.int_, np.float_) to native Python
        so json.dump will succeed.
        """
        # Numpy booleans
        if isinstance(obj, (np.bool_,)):
            return bool(obj)
        # Numpy numbers
        if isinstance(obj, (np.integer,)):
            return int(obj)
        if isinstance(obj, (np.floating,)):
            return float(obj)
        # Dict
        if isinstance(obj, dict):
            return {k: self._to_serializable(v) for k, v in obj.items()}
        # List/Tuple
        if isinstance(obj, (list, tuple)):
            return [self._to_serializable(v) for v in obj]
        # Pass-through primitives and others
        return obj

