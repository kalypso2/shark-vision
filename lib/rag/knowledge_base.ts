/**
 * RAG Knowledge Base for Body Language Analysis
 * Contains research-backed definitions, benchmarks, and techniques
 */

export interface KnowledgeEntry {
  id: string
  type: 'definition' | 'benchmark' | 'technique' | 'research_finding'
  category: 'posture' | 'gesture' | 'eye_contact' | 'movement' | 'engagement'
  content: string
  source: string
  quantitative_data?: {
    metric: string
    value: number
    unit: string
    range?: [number, number]
    context: string
  }
}

export const KNOWLEDGE_BASE: KnowledgeEntry[] = [
  // POSTURE RESEARCH
  {
    id: 'posture_def_1',
    type: 'definition',
    category: 'posture',
    content: 'Good posture in presentations involves keeping the spine aligned, shoulders back and relaxed, and weight distributed evenly. The head should be level with chin parallel to ground, projecting confidence and openness to the audience.',
    source: 'Body Language PDF - Technical Breakdown of Non-Verbal Communication',
  },
  {
    id: 'posture_bench_1',
    type: 'benchmark',
    category: 'posture',
    content: 'Professional speakers maintain good posture 75-85% of presentation time. Slouching more than 15% of time significantly reduces perceived credibility.',
    source: 'Toastmasters International - Using Body Language Guide',
    quantitative_data: {
      metric: 'good_posture_percentage',
      value: 80,
      unit: 'percent',
      range: [75, 85],
      context: 'professional speakers',
    },
  },
  
  // GESTURE RESEARCH
  {
    id: 'gesture_def_1',
    type: 'definition',
    category: 'gesture',
    content: 'Gestures are categorized into three types: (1) Conventional - culturally specific signals like thumbs up, (2) Descriptive - illustrate size, shape, or location of objects, (3) Emotional - express feelings and add emphasis to verbal message.',
    source: 'Toastmasters International - Using Body Language, Technical Classification',
  },
  {
    id: 'gesture_bench_1',
    type: 'benchmark',
    category: 'gesture',
    content: 'Effective speakers use 3-8 deliberate gestures per minute. Too few (< 2/min) appears stiff; too many (> 10/min) appears frantic or nervous.',
    source: 'GestureLens: Visual Analysis of Gestures in Presentation Videos',
    quantitative_data: {
      metric: 'gesture_frequency',
      value: 5.5,
      unit: 'per_minute',
      range: [3, 8],
      context: 'effective presenters',
    },
  },
  {
    id: 'gesture_tech_1',
    type: 'technique',
    category: 'gesture',
    content: 'The "Gesture Box" technique: Keep gestures within a defined space between shoulders and waist, extending no further than elbow width from body. This creates natural, controlled movement that reinforces message without distraction.',
    source: 'How to Improve Non-Verbal Communication Skills: Master the 5 Core Elements',
  },
  {
    id: 'gesture_finding_1',
    type: 'research_finding',
    category: 'gesture',
    content: 'Symmetric, bilateral gestures (using both hands equally) are perceived as more confident and authoritative than asymmetric, one-handed gestures. Ratio of symmetric to total gestures above 60% correlates with higher audience engagement scores.',
    source: 'GestureLens Research Paper - Spatial and Temporal Distribution Analysis',
    quantitative_data: {
      metric: 'symmetric_gesture_ratio',
      value: 0.65,
      unit: 'ratio',
      range: [0.6, 0.8],
      context: 'high-engagement presenters',
    },
  },

  // EYE CONTACT RESEARCH
  {
    id: 'eye_contact_def_1',
    type: 'definition',
    category: 'eye_contact',
    content: 'Effective eye contact involves looking directly at individual audience members for 1-2 complete sentences before moving to another person. This creates connection without making anyone uncomfortable.',
    source: '7 Top Tips For Good Body Language In Presentations',
  },
  {
    id: 'eye_contact_bench_1',
    type: 'benchmark',
    category: 'eye_contact',
    content: 'Professional speakers maintain forward-facing gaze 85-95% of presentation time. Looking away more than 15% (excluding intentional reference to slides) reduces perceived confidence and trustworthiness.',
    source: 'Overcoming Public Speaking Anxiety through Nonverbal Communication',
    quantitative_data: {
      metric: 'forward_gaze_percentage',
      value: 90,
      unit: 'percent',
      range: [85, 95],
      context: 'confident presenters',
    },
  },
  {
    id: 'eye_contact_tech_1',
    type: 'technique',
    category: 'eye_contact',
    content: 'The "Triangle Method" for groups: Divide audience into three sections (left, center, right). Spend roughly equal time making eye contact with each section, following a triangular pattern to ensure everyone feels included.',
    source: 'How to Improve Non-Verbal Communication Skills: Master the 5 Core Elements',
  },

  // MOVEMENT & ENGAGEMENT RESEARCH
  {
    id: 'movement_def_1',
    type: 'definition',
    category: 'movement',
    content: 'Purposeful movement means shifting position deliberately to mark transitions between topics or emphasize points. Random pacing signals nervousness; strategic movement enhances message structure.',
    source: 'The Ultimate Guide to Body Language in Public Speaking',
  },
  {
    id: 'movement_tech_1',
    type: 'technique',
    category: 'movement',
    content: 'Plan movement to coincide with content changes: Move to different stage positions when transitioning topics, step forward for emphasis, step back for reflection. Avoid pacing or swaying which distracts from message.',
    source: '7 Top Tips For Good Body Language In Presentations',
  },
  {
    id: 'engagement_def_1',
    type: 'definition',
    category: 'engagement',
    content: 'Physical engagement manifests as dynamic torso and head movement - subtle shifts in posture, leaning forward for emphasis, head nods for emphasis. Static, rigid posture for extended periods signals low energy or nervousness.',
    source: 'Body Language PDF - Whole-Body Movement Analysis',
  },
  {
    id: 'engagement_bench_1',
    type: 'benchmark',
    category: 'engagement',
    content: 'Engaging speakers demonstrate continuous subtle movement (micro-adjustments in posture, head position) averaging 8-15% of body normalized per minute. Completely static periods should not exceed 5-10 seconds.',
    source: 'GestureLens - Temporal Distribution Analysis',
    quantitative_data: {
      metric: 'torso_movement_rate',
      value: 0.011,
      unit: 'normalized_movement_per_second',
      range: [0.008, 0.015],
      context: 'engaging TED speakers',
    },
  },
  {
    id: 'engagement_finding_1',
    type: 'research_finding',
    category: 'engagement',
    content: 'Speakers rated as "highly engaging" by audiences show 40% more upper-body micro-movements (small head nods, shoulder shifts, torso leans) than those rated "monotone". Movement frequency correlates with perceived passion and conviction.',
    source: 'Overcoming Public Speaking Anxiety through Nonverbal Communication Research',
  },

  // INTEGRATION & ALIGNMENT
  {
    id: 'integration_finding_1',
    type: 'research_finding',
    category: 'gesture',
    content: 'Facial expressions must align with gesture intensity and vocal tone for authenticity. Mismatched non-verbal cues (smiling while discussing serious topics, frantic gestures with calm voice) reduce audience trust by 30-40%.',
    source: 'The Ultimate Guide to Body Language in Public Speaking - Alignment Techniques',
  },
  {
    id: 'posture_technique_1',
    type: 'technique',
    category: 'posture',
    content: 'Stance strategy: When standing, distribute weight evenly on both feet, shoulder-width apart. When sitting, sit on front third of chair with feet flat on floor, spine straight but not rigid. This projects confidence and allows for natural movement.',
    source: 'How to Improve Non-Verbal Communication Skills - Posture Strategies',
  },
]

/**
 * Get knowledge entries by category
 */
export function getKnowledgeByCategory(category: KnowledgeEntry['category']): KnowledgeEntry[] {
  return KNOWLEDGE_BASE.filter(entry => entry.category === category)
}

/**
 * Get quantitative benchmarks
 */
export function getBenchmarks(): KnowledgeEntry[] {
  return KNOWLEDGE_BASE.filter(entry => entry.quantitative_data !== undefined)
}

/**
 * Get research-backed techniques
 */
export function getTechniques(category?: KnowledgeEntry['category']): KnowledgeEntry[] {
  const techniques = KNOWLEDGE_BASE.filter(entry => entry.type === 'technique')
  return category ? techniques.filter(t => t.category === category) : techniques
}

/**
 * Search knowledge base by content (simple text match for now)
 */
export function searchKnowledge(query: string): KnowledgeEntry[] {
  const lowerQuery = query.toLowerCase()
  return KNOWLEDGE_BASE.filter(entry => 
    entry.content.toLowerCase().includes(lowerQuery) ||
    entry.category.toLowerCase().includes(lowerQuery)
  )
}

