# RAG (Retrieval-Augmented Generation) System

## Overview

The RAG system grounds AI coaching feedback in peer-reviewed research and evidence-based benchmarks for presentation body language. Instead of relying solely on the LLM's training data, we retrieve relevant research findings and compare user metrics against proven standards.

## Architecture

### Components

1. **Knowledge Base** (`knowledge_base.ts`)
   - Curated repository of research-backed definitions, benchmarks, and techniques
   - Sources: Toastmasters guides, GestureLens research, body language analysis papers
   - Includes quantitative data (e.g., gesture frequency 3-8/min for effective speakers)

2. **Context Builder** (`context_builder.ts`)
   - Analyzes user's body language scores
   - Retrieves relevant knowledge entries based on performance
   - Builds comparisons between user metrics and research benchmarks
   - Formats context for LLM consumption

3. **Coaching API Integration** (`app/api/coaching/route.ts`)
   - Injects RAG context into Gemini prompt
   - Ensures feedback is grounded in cited research
   - Provides actionable, evidence-based techniques

## Research Sources

### Gesture Analysis
- **GestureLens: Visual Analysis of Gestures in Presentation Videos**
  - Benchmark: 3-8 gestures/minute for effective speakers
  - Finding: 60%+ symmetric gesture ratio correlates with higher engagement

### Body Language Fundamentals
- **Body Language PDF - Technical Breakdown**
  - Posture components: spine alignment, shoulder position, weight distribution
  - Engagement indicators: torso movement, head nods, micro-adjustments

### Professional Speaking Standards
- **Toastmasters International - Using Body Language**
  - Gesture taxonomy: Conventional, Descriptive, Emotional
  - Posture benchmark: 75-85% good posture for professional speakers

### Eye Contact Research
- **Overcoming Public Speaking Anxiety through Nonverbal Communication**
  - Benchmark: 85-95% forward-facing gaze for confident presenters
  - Technique: Hold eye contact for 1-2 complete sentences per person

### Practical Techniques
- **How to Improve Non-Verbal Communication Skills**
  - "Gesture Box": Keep gestures between shoulders and waist
  - "Triangle Method": Divide audience into three sections for eye contact
  - Stance strategy: Weight distributed evenly, shoulder-width apart

## How It Works

### 1. Analysis Phase
User presents → Body language detected → Metrics calculated

### 2. Context Retrieval Phase
```typescript
const ragContext = buildContext(analysis)
// Retrieves:
// - Definitions for problem areas (scores < 60)
// - Benchmarks for all metrics
// - Comparisons (user vs. research standards)
// - Actionable techniques
```

### 3. Prompt Enhancement Phase
```typescript
const contextPrompt = formatContextForPrompt(ragContext)
// Formats as:
// **Research-Backed Definitions:**
// **Evidence-Based Benchmarks:**
// **Performance Comparisons:**
// **Actionable Techniques:**
```

### 4. Grounded Coaching Phase
Gemini generates feedback using both:
- Its general knowledge of coaching
- The specific research context provided

Result: Feedback like "Your gesture frequency (4.2/min) is within the optimal 3-8/min range (GestureLens research)"

## Example: Gesture Quality Analysis

### Without RAG:
"Your gestures look good! Try using both hands more."

### With RAG:
"Your gesture quality (67/100) indicates good bilateral movement but falls short of the research benchmark where speakers rated as highly engaging show 60%+ symmetric gesture ratio (GestureLens). Try the 'Gesture Box' technique: Keep gestures between shoulders and waist for natural, controlled movement (How to Improve Non-Verbal Communication Skills)."

## Benefits

1. **Evidence-Based**: All feedback grounded in cited research
2. **Quantitative**: Specific numbers and ranges, not vague advice
3. **Actionable**: Techniques from proven sources
4. **Transparent**: Sources cited so users can verify
5. **Educational**: Users learn *why* something matters, not just that it does

## Future Enhancements

### 1. Vector Embeddings
- Use Gemini Embedding API for semantic search
- Better retrieval of relevant knowledge

### 2. Expanded Knowledge Base
- More research papers (TED talk analysis, corporate training studies)
- Cultural variations in body language
- Industry-specific benchmarks

### 3. User Benchmarking
- Store user's historical data
- Show personal improvement over time
- Compare against their own baseline

### 4. Dynamic Threshold Tuning
- Use research benchmarks to auto-calibrate detection thresholds
- E.g., if research says 3-8 gestures/min is optimal, tune `GESTURE_THRESHOLD` to detect that range

## Research Integration Strategy

### Current Implementation (Keyword Matching)
Simple but effective: Filter knowledge base by category and score thresholds

### Next: Semantic Search
```typescript
import { GoogleGenerativeAI } from '@google/generative-ai'

// Generate embeddings for knowledge base
const embeddings = await generateEmbeddings(KNOWLEDGE_BASE)

// For user query, retrieve top-k most relevant entries
const query = "How can I improve my gesture quality?"
const queryEmbedding = await generateEmbedding(query)
const relevantKnowledge = findMostSimilar(queryEmbedding, embeddings, k=5)
```

### Advanced: Hybrid Retrieval
Combine:
- Keyword filtering (fast, precise for known categories)
- Semantic search (captures nuance, handles complex queries)
- Score-based ranking (prioritize problem areas)

## Adding New Research

To add new research findings:

1. **Add to `knowledge_base.ts`:**
```typescript
{
  id: 'unique_id',
  type: 'research_finding' | 'benchmark' | 'technique' | 'definition',
  category: 'posture' | 'gesture' | 'eye_contact' | 'movement' | 'engagement',
  content: 'The research finding...',
  source: 'Paper title or guide name',
  quantitative_data?: {
    metric: 'what_was_measured',
    value: 5.5,
    unit: 'per_minute',
    range: [3, 8],
    context: 'TED speakers'
  }
}
```

2. **Update `context_builder.ts` if needed:**
   - Add new benchmark comparisons
   - Include new categories

3. **Test with real data:**
   - Record a presentation
   - Verify coaching cites the new research
   - Ensure comparisons are accurate

## Conclusion

RAG transforms Shark Vision from "AI guessing" to "AI analyzing with scientific backing." Every piece of feedback is traceable to peer-reviewed research or proven techniques, making the coaching both more credible and more actionable.

