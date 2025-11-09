"""
RAG Context Builder - Ported from TypeScript
Retrieves relevant research based on analysis results
"""

from typing import Dict, List
from .knowledge_base import (
    KnowledgeEntry,
    KNOWLEDGE_BASE,
    get_knowledge_by_category,
    get_benchmarks,
    get_techniques
)


class AnalysisContext:
    def __init__(self):
        self.definitions: List[KnowledgeEntry] = []
        self.benchmarks: List[KnowledgeEntry] = []
        self.techniques: List[KnowledgeEntry] = []
        self.comparisons: List[str] = []


def build_context(analysis: Dict) -> AnalysisContext:
    """
    Build RAG context based on analysis results
    
    Args:
        analysis: Full analysis dict with aggregates and timeline
    
    Returns:
        AnalysisContext with relevant research
    """
    context = AnalysisContext()
    
    aggregates = analysis.get('aggregates', {})
    if not aggregates:
        return context
    
    # Identify problem areas (scores < 60)
    problem_areas = []
    if aggregates.get('posture_score', 100) < 60:
        problem_areas.append('posture')
    if aggregates.get('eye_contact_proxy', 100) < 60:
        problem_areas.append('eye_contact')
    if aggregates.get('engagement_score', 100) < 60:
        problem_areas.append('engagement')
    if aggregates.get('gesture_quality', 100) < 60:
        problem_areas.append('gesture')
    
    # Add definitions for problem areas
    for area in problem_areas:
        definitions = get_knowledge_by_category(area)
        context.definitions.extend([
            d for d in definitions if d.type == 'definition'
        ])
    
    # Get relevant benchmarks
    all_benchmarks = get_benchmarks()
    
    # Posture benchmark
    posture_score = aggregates.get('posture_score', 0)
    posture_bench = next((b for b in all_benchmarks if b.id == 'posture_bench_1'), None)
    if posture_bench:
        context.benchmarks.append(posture_bench)
        if posture_score >= 75:
            context.comparisons.append(
                f"Your posture score ({posture_score:.0f}/100) meets professional standards (75-85%)."
            )
        else:
            context.comparisons.append(
                f"Your posture score ({posture_score:.0f}/100) is below the professional benchmark of 75-85%."
            )
    
    # Gesture benchmarks
    gesture_bench = next((b for b in all_benchmarks if b.id == 'gesture_bench_1'), None)
    if gesture_bench:
        context.benchmarks.append(gesture_bench)
        frequency = aggregates.get('gesture_frequency', 0)
        if frequency < 3:
            context.comparisons.append(
                f"Your gesture frequency ({frequency:.1f}/min) is below the recommended 3-8/min range. This may appear stiff or reserved."
            )
        elif frequency > 8:
            context.comparisons.append(
                f"Your gesture frequency ({frequency:.1f}/min) exceeds the recommended 3-8/min range. This may appear frantic."
            )
        else:
            context.comparisons.append(
                f"Your gesture frequency ({frequency:.1f}/min) is within the optimal 3-8/min range."
            )
    
    # Gesture symmetry
    symmetry_bench = next((b for b in all_benchmarks if b.id == 'gesture_finding_1'), None)
    if symmetry_bench:
        gesture_quality = aggregates.get('gesture_quality', 0)
        if gesture_quality > 0:
            context.benchmarks.append(symmetry_bench)
            if gesture_quality >= 60:
                context.comparisons.append(
                    f"Your gesture quality score ({gesture_quality:.0f}/100) indicates good use of bilateral, symmetric gestures."
                )
            else:
                context.comparisons.append(
                    f"Your gesture quality score ({gesture_quality:.0f}/100) suggests over-reliance on one-handed or asymmetric gestures."
                )
    
    # Eye contact benchmark
    eye_bench = next((b for b in all_benchmarks if b.id == 'eye_contact_bench_1'), None)
    if eye_bench:
        context.benchmarks.append(eye_bench)
        eye_contact = aggregates.get('eye_contact_proxy', 0)
        if eye_contact >= 85:
            context.comparisons.append(
                f"Your eye contact proxy ({eye_contact:.0f}/100) meets professional standards (85-95%)."
            )
        else:
            context.comparisons.append(
                f"Your eye contact proxy ({eye_contact:.0f}/100) is below the professional benchmark of 85-95%."
            )
    
    # Engagement benchmark
    engagement_bench = next((b for b in all_benchmarks if b.id == 'engagement_bench_1'), None)
    if engagement_bench:
        context.benchmarks.append(engagement_bench)
        engagement = aggregates.get('engagement_score', 0)
        if engagement < 60:
            context.comparisons.append(
                f"Your engagement score ({engagement:.0f}/100) suggests limited torso/head movement. Engaging speakers show continuous subtle movement."
            )
    
    # Facial expressions (NEW with MediaPipe)
    smile_freq = aggregates.get('smile_frequency', 0)
    if smile_freq > 0:
        facial_bench = next((b for b in all_benchmarks if b.id == 'facial_finding_1'), None)
        if facial_bench:
            context.benchmarks.append(facial_bench)
            context.comparisons.append(
                f"Your smile frequency ({smile_freq:.1f}/min) adds warmth and engagement to your presentation."
            )
    
    # Add actionable techniques for problem areas
    for area in problem_areas:
        relevant_techniques = get_techniques(area)
        context.techniques.extend(relevant_techniques[:2])  # Max 2 per category
    
    # Remove duplicates by ID (objects are unhashable)
    context.definitions = list({d.id: d for d in context.definitions}.values())
    context.benchmarks = list({b.id: b for b in context.benchmarks}.values())
    context.techniques = list({t.id: t for t in context.techniques}.values())
    
    return context


def format_context_for_prompt(context: AnalysisContext) -> str:
    """
    Format RAG context for LLM prompt
    """
    prompt = ""
    
    if context.definitions:
        prompt += "**Research-Backed Definitions:**\n"
        for definition in context.definitions:
            prompt += f"- {definition.content} (Source: {definition.source})\n"
        prompt += "\n"
    
    if context.benchmarks:
        prompt += "**Evidence-Based Benchmarks:**\n"
        for bench in context.benchmarks:
            prompt += f"- {bench.content} (Source: {bench.source})\n"
            if bench.quantitative_data:
                qd = bench.quantitative_data
                prompt += f"  Data: {qd.metric} = {qd.value} {qd.unit}"
                if qd.range:
                    prompt += f" (range: {qd.range[0]}-{qd.range[1]})"
                prompt += "\n"
        prompt += "\n"
    
    if context.comparisons:
        prompt += "**Performance Comparisons:**\n"
        for comp in context.comparisons:
            prompt += f"- {comp}\n"
        prompt += "\n"
    
    if context.techniques:
        prompt += "**Actionable Techniques:**\n"
        for tech in context.techniques:
            prompt += f"- {tech.content} (Source: {tech.source})\n"
        prompt += "\n"
    
    return prompt

