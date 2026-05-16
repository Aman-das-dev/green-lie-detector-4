export type ConditionStatus = "available" | "partially_available" | "not_available"

export interface ConditionExamples {
  positive: string[]
  negative: string[]
}

export interface CriterionAssessment {
  status: ConditionStatus
  explanation: string
  examples: ConditionExamples
}

export interface CriteriaAssessment {
  decision_authority: CriterionAssessment
  access_to_alternatives: CriterionAssessment
  affordability: CriterionAssessment
  infrastructure_availability: CriterionAssessment
  enforcement_power: CriterionAssessment
}

export type CriterionKey = keyof CriteriaAssessment

export interface Statement {
  id: string
  statement: string
  target_group: string
  source_type: string
  action: string
  criteria_assessment: CriteriaAssessment
  verdict: string
  reasoning: string
  actionable_suggestions: string[]
}

export interface UserSelection {
  criterion: CriterionKey
  userChoice: ConditionStatus
  isCorrect: boolean
}

export interface AnalysisResult {
  statement: Statement
  userSelections: UserSelection[]
  missingConditions: CriterionKey[]
  verdict: "structurally_honest" | "structurally_dishonest" | "partially_valid"
  youthValidation?: YouthValidation
}

export interface YouthValidation {
  totalVotes: number
  confirmMissing: Record<CriterionKey, number>
  confirmAvailable: Record<CriterionKey, number>
}

export interface StoredAnalysis {
  id: string
  statementId: string
  statement: string
  targetGroup: string
  sourceType: string
  userSelections: UserSelection[]
  missingConditions: CriterionKey[]
  verdict: string
  timestamp: number
  youthVotes?: {
    criterion: CriterionKey
    voteType: "missing" | "available"
  }[]
}

export const CRITERIA_LABELS: Record<CriterionKey, string> = {
  decision_authority: "Decision Authority",
  access_to_alternatives: "Access to Alternatives",
  affordability: "Affordability",
  infrastructure_availability: "Infrastructure Availability",
  enforcement_power: "Enforcement Power",
}

export const CRITERIA_QUESTIONS: Record<CriterionKey, string> = {
  decision_authority: "Does the target group have the power to make this decision?",
  access_to_alternatives: "Are sustainable alternatives available to the target group?",
  affordability: "Can the target group afford to take this action?",
  infrastructure_availability: "Does the necessary infrastructure exist?",
  enforcement_power: "Can the target group enforce systemic change?",
}
