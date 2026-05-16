import type { CriterionKey, CriteriaAssessment } from "./types"

const CUSTOM_STATEMENTS_KEY = "green_lie_custom_statements"

export interface CustomStatementInput {
  statement: string
  sourceType: string
  targetGroup: string
}

export interface StoredCustomStatement extends CustomStatementInput {
  id: string
  timestamp: number
  analyzed: boolean
  analysisResult?: {
    missingConditions: CriterionKey[]
    verdict: string
    criteriaAssessment: CriteriaAssessment
  }
}

export function saveCustomStatement(input: CustomStatementInput): string {
  const id = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  const statement: StoredCustomStatement = {
    ...input,
    id,
    timestamp: Date.now(),
    analyzed: false,
  }

  const existing = getCustomStatements()
  existing.push(statement)

  if (typeof window !== "undefined") {
    localStorage.setItem(CUSTOM_STATEMENTS_KEY, JSON.stringify(existing))
  }

  return id
}

export function getCustomStatements(): StoredCustomStatement[] {
  if (typeof window === "undefined") return []

  const stored = localStorage.getItem(CUSTOM_STATEMENTS_KEY)
  if (!stored) return []

  try {
    return JSON.parse(stored)
  } catch {
    return []
  }
}

export function getCustomStatementById(id: string): StoredCustomStatement | undefined {
  return getCustomStatements().find((s) => s.id === id)
}

export function updateCustomStatementAnalysis(
  id: string,
  analysisResult: StoredCustomStatement["analysisResult"],
): void {
  if (typeof window === "undefined") return

  const statements = getCustomStatements()
  const index = statements.findIndex((s) => s.id === id)

  if (index !== -1) {
    statements[index].analyzed = true
    statements[index].analysisResult = analysisResult
    localStorage.setItem(CUSTOM_STATEMENTS_KEY, JSON.stringify(statements))
  }
}

export function getAllAnalyzedStatements(): Array<{
  id: string
  statement: string
  sourceType: string
  targetGroup: string
  verdict: string
  missingConditions: CriterionKey[]
  isCustom: boolean
}> {
  const customStatements = getCustomStatements()
    .filter((s) => s.analyzed && s.analysisResult)
    .map((s) => {
      // Normalize verdict to match display expectations
      let normalizedVerdict = s.analysisResult!.verdict

      // Handle different verdict formats that might be saved
      if (normalizedVerdict === "structurally_dishonest") {
        normalizedVerdict = "GREEN LIE"
      } else if (normalizedVerdict === "partially_valid") {
        normalizedVerdict = "PARTIALLY VALID"
      } else if (normalizedVerdict === "structurally_honest") {
        normalizedVerdict = "STRUCTURALLY HONEST"
      }

      return {
        id: s.id,
        statement: s.statement,
        sourceType: s.sourceType,
        targetGroup: s.targetGroup,
        verdict: normalizedVerdict,
        missingConditions: s.analysisResult!.missingConditions,
        isCustom: true,
      }
    })

  return customStatements
}
