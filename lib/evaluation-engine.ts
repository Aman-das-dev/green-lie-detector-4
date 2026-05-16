import type { Statement, CriterionKey, UserSelection, ConditionStatus, AnalysisResult } from "./types"
import greenLieFacts from "./green-lie-facts.json"

export function getStatements(): Statement[] {
  return greenLieFacts.sustainability_statements as Statement[]
}

export function getStatementById(id: string): Statement | undefined {
  return getStatements().find((s) => s.id === id)
}

const TARGET_GROUP_POWERS: Record<string, CriterionKey[]> = {
  // Groups with HIGH structural power
  Government: [
    "decision_authority",
    "access_to_alternatives",
    "affordability",
    "infrastructure_availability",
    "enforcement_power",
  ],
  "City Government": [
    "decision_authority",
    "access_to_alternatives",
    "affordability",
    "infrastructure_availability",
    "enforcement_power",
  ],
  Corporations: ["decision_authority", "access_to_alternatives", "affordability", "infrastructure_availability"],
  "University Administration": [
    "decision_authority",
    "access_to_alternatives",
    "affordability",
    "infrastructure_availability",
  ],
  Institutions: ["decision_authority", "access_to_alternatives", "infrastructure_availability"],
  // Groups with LIMITED structural power
  Students: [],
  Youth: [],
  Consumers: ["access_to_alternatives"], // Only if alternatives exist and are affordable
  "General Public": [],
  Employees: [],
  Citizens: [],
}

export function evaluateConditionsForTarget(
  statementText: string,
  targetGroup: string,
  sourceType: string,
): {
  assessment: Record<CriterionKey, { status: ConditionStatus; explanation: string }>
  missingConditions: CriterionKey[]
} {
  const targetPowers = TARGET_GROUP_POWERS[targetGroup] || []
  const assessment: Record<CriterionKey, { status: ConditionStatus; explanation: string }> = {} as any
  const missingConditions: CriterionKey[] = []

  const allCriteria: CriterionKey[] = [
    "decision_authority",
    "access_to_alternatives",
    "affordability",
    "infrastructure_availability",
    "enforcement_power",
  ]

  // Check if statement requires infrastructure (keywords)
  const requiresInfrastructure = /reusable|recycle|bike|public transport|refill|solar|compost/i.test(statementText)
  const requiresAffordability = /buy|purchase|switch|invest|afford/i.test(statementText)
  const requiresAuthority = /should|must|need to|have to|reduce|stop|avoid/i.test(statementText)

  allCriteria.forEach((criterion) => {
    const hasPower = targetPowers.includes(criterion)

    // Dynamic evaluation based on target group's actual power
    if (hasPower) {
      assessment[criterion] = {
        status: "available",
        explanation: `${targetGroup} has structural control over ${criterion.replace(/_/g, " ")}.`,
      }
    } else {
      // Check if this criterion is relevant to the statement
      let isRelevant = false

      if (criterion === "infrastructure_availability" && requiresInfrastructure) isRelevant = true
      if (criterion === "affordability" && requiresAffordability) isRelevant = true
      if (criterion === "decision_authority" && requiresAuthority) isRelevant = true
      if (criterion === "access_to_alternatives") isRelevant = true // Always relevant
      if (criterion === "enforcement_power" && sourceType === "Government Policy") isRelevant = true

      if (isRelevant) {
        assessment[criterion] = {
          status: "not_available",
          explanation: `${targetGroup} lacks structural control over ${criterion.replace(/_/g, " ")}. This power typically lies with institutions, not individuals.`,
        }
        missingConditions.push(criterion)
      } else {
        assessment[criterion] = {
          status: "available",
          explanation: `This criterion is not a barrier for this specific statement.`,
        }
      }
    }
  })

  return { assessment, missingConditions }
}

export function calculateDynamicVerdict(
  statementText: string,
  targetGroup: string,
  sourceType: string,
): {
  verdict: "structurally_honest" | "structurally_dishonest" | "partially_valid"
  missingConditions: CriterionKey[]
  assessment: Record<CriterionKey, { status: ConditionStatus; explanation: string }>
  suggestions: string[]
} {
  const { assessment, missingConditions } = evaluateConditionsForTarget(statementText, targetGroup, sourceType)

  let verdict: "structurally_honest" | "structurally_dishonest" | "partially_valid"

  if (missingConditions.length >= 3) {
    verdict = "structurally_dishonest"
  } else if (missingConditions.length >= 1) {
    verdict = "partially_valid"
  } else {
    verdict = "structurally_honest"
  }

  const suggestions = generateActionableSuggestions(missingConditions)

  return {
    verdict,
    missingConditions,
    assessment,
    suggestions: Object.values(suggestions),
  }
}

export function calculateVerdictFromUserSelections(selections: Record<CriterionKey, ConditionStatus | null>): {
  verdict: "structurally_honest" | "structurally_dishonest" | "partially_valid"
  missingConditions: CriterionKey[]
  partialConditions: CriterionKey[]
  availableConditions: CriterionKey[]
  probability: number
  reasoning: string
  statistics: {
    totalConditions: number
    missingCount: number
    partialCount: number
    availableCount: number
    honestyScore: number
  }
} {
  const missingConditions: CriterionKey[] = []
  const partialConditions: CriterionKey[] = []
  const availableConditions: CriterionKey[] = []

  const allCriteria: CriterionKey[] = [
    "decision_authority",
    "access_to_alternatives",
    "affordability",
    "infrastructure_availability",
    "enforcement_power",
  ]

  // Count based on actual user selections
  allCriteria.forEach((criterion) => {
    const selection = selections[criterion]
    if (selection === "not_available") {
      missingConditions.push(criterion)
    } else if (selection === "partially_available") {
      partialConditions.push(criterion)
    } else if (selection === "available") {
      availableConditions.push(criterion)
    }
  })

  const totalConditions = allCriteria.length
  const missingCount = missingConditions.length
  const partialCount = partialConditions.length
  const availableCount = availableConditions.length

  // Calculate honesty score: available=1, partial=0.5, missing=0
  const honestyScore = ((availableCount * 1 + partialCount * 0.5) / totalConditions) * 100

  // Calculate probability of structural honesty
  const probability = Math.round(honestyScore)

  // Determine verdict based on user selections
  let verdict: "structurally_honest" | "structurally_dishonest" | "partially_valid"
  let reasoning: string

  if (missingCount >= 3) {
    verdict = "structurally_dishonest"
    reasoning = `With ${missingCount} out of ${totalConditions} conditions missing, this statement places responsibility on a group without providing the structural support needed. The target group lacks control over ${missingConditions.length} critical conditions.`
  } else if (missingCount === 0 && partialCount === 0) {
    verdict = "structurally_honest"
    reasoning = `All ${totalConditions} conditions are available. The target group has full structural power to implement this action.`
  } else if (missingCount === 0 && partialCount > 0) {
    verdict = partialCount >= 3 ? "partially_valid" : "structurally_honest"
    reasoning = `While no conditions are completely missing, ${partialCount} conditions are only partially available. ${partialCount >= 3 ? "This creates significant barriers to action." : "Minor improvements could make this fully actionable."}`
  } else if (missingCount === 1) {
    verdict = "partially_valid"
    reasoning = `Only 1 condition is missing (${missingConditions[0].replace(/_/g, " ")}), making this statement partially valid. Addressing this gap would make it structurally honest.`
  } else if (missingCount === 2) {
    verdict = "partially_valid"
    reasoning = `${missingCount} conditions are missing: ${missingConditions.map((c) => c.replace(/_/g, " ")).join(" and ")}. This creates meaningful barriers but is not fully dishonest.`
  } else {
    verdict = "structurally_dishonest"
    reasoning = `${missingCount} conditions are missing, making it structurally unfair to expect compliance from the target group.`
  }

  return {
    verdict,
    missingConditions,
    partialConditions,
    availableConditions,
    probability,
    reasoning,
    statistics: {
      totalConditions,
      missingCount,
      partialCount,
      availableCount,
      honestyScore: Math.round(honestyScore),
    },
  }
}

const TARGET_GROUP_TYPICAL_POWER: Record<string, { typically_has: CriterionKey[]; typically_lacks: CriterionKey[] }> = {
  Government: {
    typically_has: [
      "decision_authority",
      "access_to_alternatives",
      "affordability",
      "infrastructure_availability",
      "enforcement_power",
    ],
    typically_lacks: [],
  },
  "City Government": {
    typically_has: [
      "decision_authority",
      "access_to_alternatives",
      "affordability",
      "infrastructure_availability",
      "enforcement_power",
    ],
    typically_lacks: [],
  },
  Corporations: {
    typically_has: ["decision_authority", "access_to_alternatives", "affordability", "infrastructure_availability"],
    typically_lacks: ["enforcement_power"],
  },
  "University Administration": {
    typically_has: ["decision_authority", "access_to_alternatives", "affordability", "infrastructure_availability"],
    typically_lacks: ["enforcement_power"],
  },
  Institutions: {
    typically_has: ["decision_authority", "access_to_alternatives", "infrastructure_availability"],
    typically_lacks: ["enforcement_power", "affordability"],
  },
  Students: {
    typically_has: [],
    typically_lacks: [
      "decision_authority",
      "access_to_alternatives",
      "affordability",
      "infrastructure_availability",
      "enforcement_power",
    ],
  },
  Youth: {
    typically_has: [],
    typically_lacks: [
      "decision_authority",
      "access_to_alternatives",
      "affordability",
      "infrastructure_availability",
      "enforcement_power",
    ],
  },
  Consumers: {
    typically_has: ["access_to_alternatives"],
    typically_lacks: ["decision_authority", "affordability", "infrastructure_availability", "enforcement_power"],
  },
  "General Public": {
    typically_has: [],
    typically_lacks: ["decision_authority", "affordability", "infrastructure_availability", "enforcement_power"],
  },
  Employees: {
    typically_has: [],
    typically_lacks: ["decision_authority", "infrastructure_availability", "enforcement_power"],
  },
  Citizens: {
    typically_has: ["access_to_alternatives"],
    typically_lacks: ["decision_authority", "infrastructure_availability", "enforcement_power"],
  },
}

export function getTargetGroupContext(targetGroup: string): {
  typicallyHas: CriterionKey[]
  typicallyLacks: CriterionKey[]
  powerLevel: "high" | "medium" | "low"
  contextNote: string
} {
  const data = TARGET_GROUP_TYPICAL_POWER[targetGroup] || TARGET_GROUP_TYPICAL_POWER["General Public"]

  const powerLevel = data.typically_has.length >= 4 ? "high" : data.typically_has.length >= 2 ? "medium" : "low"

  let contextNote = ""
  if (powerLevel === "high") {
    contextNote = `${targetGroup} typically has high structural power and can implement systemic changes.`
  } else if (powerLevel === "medium") {
    contextNote = `${targetGroup} has moderate structural power but may face some limitations.`
  } else {
    contextNote = `${targetGroup} typically lacks structural power over most conditions. Statements targeting them often shift blame rather than create change.`
  }

  return {
    typicallyHas: data.typically_has,
    typicallyLacks: data.typically_lacks,
    powerLevel,
    contextNote,
  }
}

export function evaluateUserSelection(
  statement: Statement,
  criterion: CriterionKey,
  userChoice: ConditionStatus,
): UserSelection {
  const correctStatus = statement.criteria_assessment[criterion].status

  let isCorrect = false
  if (correctStatus === "partially_available") {
    isCorrect = userChoice === "partially_available"
  } else {
    isCorrect = userChoice === correctStatus
  }

  return {
    criterion,
    userChoice,
    isCorrect,
  }
}

export function calculateVerdict(statement: Statement, userSelections: UserSelection[]): AnalysisResult {
  const missingConditions: CriterionKey[] = []

  for (const [key, assessment] of Object.entries(statement.criteria_assessment)) {
    if (assessment.status === "not_available") {
      missingConditions.push(key as CriterionKey)
    }
  }

  let verdict: "structurally_honest" | "structurally_dishonest" | "partially_valid"

  if (missingConditions.length >= 3) {
    verdict = "structurally_dishonest"
  } else if (missingConditions.length >= 1) {
    verdict = "partially_valid"
  } else {
    verdict = "structurally_honest"
  }

  return {
    statement,
    userSelections,
    missingConditions,
    verdict,
  }
}

export function generateActionableSuggestions(missingConditions: CriterionKey[]): Record<CriterionKey, string> {
  const suggestions: Record<CriterionKey, string> = {
    decision_authority:
      "Transfer decision-making power to the target group or create participatory processes where they can influence policy",
    access_to_alternatives:
      "Ensure sustainable alternatives are widely accessible, convenient, and available at point of need",
    affordability:
      "Provide subsidies, free alternatives, or implement price controls to eliminate cost barriers for the target group",
    infrastructure_availability:
      "Install necessary infrastructure (e.g., water refill stations, bike lanes, recycling bins, composting facilities)",
    enforcement_power:
      "Grant institutional authority to enforce sustainability measures or create binding policies with accountability mechanisms",
  }

  const result: Partial<Record<CriterionKey, string>> = {}
  for (const condition of missingConditions) {
    result[condition] = suggestions[condition]
  }

  return result as Record<CriterionKey, string>
}

export function generateMakeItHonestSuggestions(
  statementText: string,
  targetGroup: string,
  missingConditions: CriterionKey[],
): string[] {
  const specificSuggestions: string[] = []

  missingConditions.forEach((condition) => {
    switch (condition) {
      case "infrastructure_availability":
        if (/reusable|refill/i.test(statementText)) {
          specificSuggestions.push(
            `To make this honest: Install water refill stations across all campus buildings by next semester`,
          )
        } else if (/bike|cycle/i.test(statementText)) {
          specificSuggestions.push(
            `To make this honest: Build protected bike lanes and secure parking before asking ${targetGroup} to cycle`,
          )
        } else if (/recycle/i.test(statementText)) {
          specificSuggestions.push(
            `To make this honest: Place clearly-labeled recycling bins within 50 meters of all common areas`,
          )
        } else {
          specificSuggestions.push(
            `To make this honest: Provide the necessary infrastructure before placing responsibility on ${targetGroup}`,
          )
        }
        break
      case "affordability":
        specificSuggestions.push(
          `To make this honest: Subsidize sustainable alternatives or provide them free to ${targetGroup}`,
        )
        break
      case "decision_authority":
        specificSuggestions.push(
          `To make this honest: Give ${targetGroup} a seat at the decision-making table through participatory governance`,
        )
        break
      case "access_to_alternatives":
        specificSuggestions.push(
          `To make this honest: Ensure sustainable options are as convenient as unsustainable ones`,
        )
        break
      case "enforcement_power":
        specificSuggestions.push(
          `To make this honest: Create institutional policies that hold corporations accountable, not individuals`,
        )
        break
    }
  })

  return specificSuggestions
}

export function getCorrectionFeedback(
  statement: Statement,
  criterion: CriterionKey,
  userChoice: ConditionStatus,
): { isCorrect: boolean; explanation: string; examples: { positive: string[]; negative: string[] } } {
  const assessment = statement.criteria_assessment[criterion]
  const isCorrect = userChoice === assessment.status

  return {
    isCorrect,
    explanation: assessment.explanation,
    examples: assessment.examples,
  }
}
