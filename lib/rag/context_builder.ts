/**
 * RAG Context Builder
 * Retrieves relevant knowledge based on analysis results
 */

import type { BodyLanguageAnalysis } from '../body_language/types'
import { 
  KNOWLEDGE_BASE, 
  getKnowledgeByCategory, 
  getBenchmarks,
  getTechniques,
  type KnowledgeEntry 
} from './knowledge_base'

export interface AnalysisContext {
  definitions: KnowledgeEntry[]
  benchmarks: KnowledgeEntry[]
  techniques: KnowledgeEntry[]
  comparisons: string[]
}

/**
 * Build context for coaching based on analysis results
 */
export function buildContext(analysis: BodyLanguageAnalysis): AnalysisContext {
  const { aggregates, timeline } = analysis
  
  const context: AnalysisContext = {
    definitions: [],
    benchmarks: [],
    techniques: [],
    comparisons: [],
  }

  // Identify problem areas (scores < 60)
  const problemAreas: Array<keyof typeof aggregates> = []
  if (aggregates.posture_score < 60) problemAreas.push('posture_score')
  if (aggregates.eye_contact_proxy < 60) problemAreas.push('eye_contact_proxy')
  if (aggregates.engagement_score < 60) problemAreas.push('engagement_score')
  if (aggregates.gesture_quality < 60) problemAreas.push('gesture_quality')

  // Add definitions for problem areas
  problemAreas.forEach(area => {
    const category = mapScoreToCategory(area)
    if (category) {
      context.definitions.push(
        ...getKnowledgeByCategory(category).filter(e => e.type === 'definition')
      )
    }
  })

  // Get relevant benchmarks
  const allBenchmarks = getBenchmarks()
  
  // Posture benchmark
  if (problemAreas.includes('posture_score') || aggregates.posture_score >= 60) {
    const postureBench = allBenchmarks.find(b => b.id === 'posture_bench_1')
    if (postureBench) {
      context.benchmarks.push(postureBench)
      context.comparisons.push(
        `Your posture score (${aggregates.posture_score}/100) ${
          aggregates.posture_score >= 75 
            ? 'meets professional standards (75-85%)' 
            : 'is below the professional benchmark of 75-85%'
        }.`
      )
    }
  }

  // Gesture benchmarks
  const gestureBench = allBenchmarks.find(b => b.id === 'gesture_bench_1')
  if (gestureBench) {
    context.benchmarks.push(gestureBench)
    const frequency = aggregates.gesture_frequency
    if (frequency < 3) {
      context.comparisons.push(
        `Your gesture frequency (${frequency.toFixed(1)}/min) is below the recommended 3-8/min range. This may appear stiff or reserved.`
      )
    } else if (frequency > 8) {
      context.comparisons.push(
        `Your gesture frequency (${frequency.toFixed(1)}/min) exceeds the recommended 3-8/min range. This may appear frantic.`
      )
    } else {
      context.comparisons.push(
        `Your gesture frequency (${frequency.toFixed(1)}/min) is within the optimal 3-8/min range.`
      )
    }
  }

  // Gesture symmetry benchmark
  const symmetryBench = allBenchmarks.find(b => b.id === 'gesture_finding_1')
  if (symmetryBench && aggregates.gesture_quality > 0) {
    context.benchmarks.push(symmetryBench)
    context.comparisons.push(
      `Your gesture quality score (${aggregates.gesture_quality}/100) ${
        aggregates.gesture_quality >= 60
          ? 'indicates good use of bilateral, symmetric gestures'
          : 'suggests over-reliance on one-handed or asymmetric gestures'
      }.`
    )
  }

  // Eye contact benchmark
  const eyeBench = allBenchmarks.find(b => b.id === 'eye_contact_bench_1')
  if (eyeBench) {
    context.benchmarks.push(eyeBench)
    context.comparisons.push(
      `Your eye contact proxy (${aggregates.eye_contact_proxy}/100) ${
        aggregates.eye_contact_proxy >= 85
          ? 'meets professional standards (85-95%)'
          : 'is below the professional benchmark of 85-95%'
      }.`
    )
  }

  // Engagement benchmark
  const engagementBench = allBenchmarks.find(b => b.id === 'engagement_bench_1')
  if (engagementBench) {
    context.benchmarks.push(engagementBench)
    if (aggregates.engagement_score < 60) {
      context.comparisons.push(
        `Your engagement score (${aggregates.engagement_score}/100) suggests limited torso/head movement. Engaging speakers show continuous subtle movement.`
      )
    }
  }

  // Add actionable techniques for problem areas
  problemAreas.forEach(area => {
    const category = mapScoreToCategory(area)
    if (category) {
      const relevantTechniques = getTechniques(category)
      context.techniques.push(...relevantTechniques.slice(0, 2)) // Max 2 per category
    }
  })

  // Remove duplicates
  context.definitions = Array.from(new Set(context.definitions))
  context.benchmarks = Array.from(new Set(context.benchmarks))
  context.techniques = Array.from(new Set(context.techniques))

  return context
}

function mapScoreToCategory(score: string): KnowledgeEntry['category'] | null {
  const mapping: Record<string, KnowledgeEntry['category']> = {
    posture_score: 'posture',
    eye_contact_proxy: 'eye_contact',
    engagement_score: 'engagement',
    gesture_quality: 'gesture',
    gesture_frequency: 'gesture',
  }
  return mapping[score] || null
}

/**
 * Format context for LLM prompt
 */
export function formatContextForPrompt(context: AnalysisContext): string {
  let prompt = ''

  if (context.definitions.length > 0) {
    prompt += '**Research-Backed Definitions:**\n'
    context.definitions.forEach(def => {
      prompt += `- ${def.content} (Source: ${def.source})\n`
    })
    prompt += '\n'
  }

  if (context.benchmarks.length > 0) {
    prompt += '**Evidence-Based Benchmarks:**\n'
    context.benchmarks.forEach(bench => {
      prompt += `- ${bench.content} (Source: ${bench.source})\n`
      if (bench.quantitative_data) {
        const qd = bench.quantitative_data
        prompt += `  Data: ${qd.metric} = ${qd.value} ${qd.unit}`
        if (qd.range) {
          prompt += ` (range: ${qd.range[0]}-${qd.range[1]})`
        }
        prompt += `\n`
      }
    })
    prompt += '\n'
  }

  if (context.comparisons.length > 0) {
    prompt += '**Performance Comparisons:**\n'
    context.comparisons.forEach(comp => {
      prompt += `- ${comp}\n`
    })
    prompt += '\n'
  }

  if (context.techniques.length > 0) {
    prompt += '**Actionable Techniques:**\n'
    context.techniques.forEach(tech => {
      prompt += `- ${tech.content} (Source: ${tech.source})\n`
    })
    prompt += '\n'
  }

  return prompt
}

