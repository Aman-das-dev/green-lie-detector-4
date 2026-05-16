import type { StoredAnalysis, CriterionKey } from "./types"

const STORAGE_KEY = "green_lie_analyses"
const VOTES_KEY = "green_lie_votes"

export function saveAnalysis(analysis: StoredAnalysis): void {
  if (typeof window === "undefined") return

  const existing = getAnalyses()
  existing.push(analysis)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing))
}

export function getAnalyses(): StoredAnalysis[] {
  if (typeof window === "undefined") return []

  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return []

  try {
    return JSON.parse(stored)
  } catch {
    return []
  }
}

export function getAggregatedStats() {
  const analyses = getAnalyses()

  const totalAnalyses = analyses.length
  const dishonestCount = analyses.filter(
    (a) => a.verdict === "structurally_dishonest" || a.verdict === "GREEN LIE",
  ).length

  // Count missing conditions frequency
  const conditionFrequency: Record<CriterionKey, number> = {
    decision_authority: 0,
    access_to_alternatives: 0,
    affordability: 0,
    infrastructure_availability: 0,
    enforcement_power: 0,
  }

  analyses.forEach((a) => {
    a.missingConditions.forEach((c) => {
      conditionFrequency[c]++
    })
  })

  // Count by source type
  const sourceFrequency: Record<string, { total: number; dishonest: number }> = {}
  analyses.forEach((a) => {
    if (!sourceFrequency[a.sourceType]) {
      sourceFrequency[a.sourceType] = { total: 0, dishonest: 0 }
    }
    sourceFrequency[a.sourceType].total++
    if (a.verdict === "structurally_dishonest" || a.verdict === "GREEN LIE") {
      sourceFrequency[a.sourceType].dishonest++
    }
  })

  return {
    totalAnalyses,
    dishonestCount,
    honestCount: totalAnalyses - dishonestCount,
    conditionFrequency,
    sourceFrequency,
  }
}

// Youth validation votes
interface Vote {
  statementId: string
  criterion: CriterionKey
  voteType: "missing" | "available"
  timestamp: number
}

export function saveVote(statementId: string, criterion: CriterionKey, voteType: "missing" | "available"): void {
  if (typeof window === "undefined") return

  const votes = getVotes()
  votes.push({ statementId, criterion, voteType, timestamp: Date.now() })
  localStorage.setItem(VOTES_KEY, JSON.stringify(votes))
}

export function getVotes(): Vote[] {
  if (typeof window === "undefined") return []

  const stored = localStorage.getItem(VOTES_KEY)
  if (!stored) return []

  try {
    return JSON.parse(stored)
  } catch {
    return []
  }
}

export function getVotesForStatement(statementId: string) {
  const votes = getVotes()
  const statementVotes = votes.filter((v) => v.statementId === statementId)

  const result: Record<CriterionKey, { missing: number; available: number }> = {
    decision_authority: { missing: 0, available: 0 },
    access_to_alternatives: { missing: 0, available: 0 },
    affordability: { missing: 0, available: 0 },
    infrastructure_availability: { missing: 0, available: 0 },
    enforcement_power: { missing: 0, available: 0 },
  }

  statementVotes.forEach((v) => {
    result[v.criterion][v.voteType]++
  })

  return result
}
