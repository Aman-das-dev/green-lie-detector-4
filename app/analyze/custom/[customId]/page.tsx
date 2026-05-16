"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
  ArrowLeft,
  ArrowRight,
  Scale,
  Check,
  X,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  ThumbsUp,
  ThumbsDown,
  Users,
  BarChart3,
  Info,
} from "lucide-react"
import { getCustomStatementById, updateCustomStatementAnalysis } from "@/lib/custom-statements"
import { saveAnalysis } from "@/lib/storage"
import {
  calculateVerdictFromUserSelections,
  generateMakeItHonestSuggestions,
  getTargetGroupContext,
  generateActionableSuggestions,
} from "@/lib/evaluation-engine"
import type { CriterionKey, ConditionStatus, UserSelection } from "@/lib/types"
import { CRITERIA_LABELS, CRITERIA_QUESTIONS } from "@/lib/types"

const CRITERIA_ORDER: CriterionKey[] = [
  "decision_authority",
  "access_to_alternatives",
  "affordability",
  "infrastructure_availability",
  "enforcement_power",
]

const CUSTOM_VOTES_KEY = "green_lie_custom_votes"

interface CustomVote {
  statementId: string
  voteType: "confirmMissing" | "confirmAvailable"
  timestamp: number
}

function getCustomVotes(): CustomVote[] {
  if (typeof window === "undefined") return []
  const stored = localStorage.getItem(CUSTOM_VOTES_KEY)
  if (!stored) return []
  try {
    return JSON.parse(stored)
  } catch {
    return []
  }
}

function saveCustomVote(statementId: string, voteType: "confirmMissing" | "confirmAvailable"): void {
  if (typeof window === "undefined") return
  const votes = getCustomVotes()
  votes.push({ statementId, voteType, timestamp: Date.now() })
  localStorage.setItem(CUSTOM_VOTES_KEY, JSON.stringify(votes))
}

function getVotesForCustomStatement(statementId: string): { confirmMissing: number; confirmAvailable: number } {
  const votes = getCustomVotes().filter((v) => v.statementId === statementId)
  return {
    confirmMissing: votes.filter((v) => v.voteType === "confirmMissing").length,
    confirmAvailable: votes.filter((v) => v.voteType === "confirmAvailable").length,
  }
}

export default function CustomAnalyzePage() {
  const params = useParams()
  const customId = params.customId as string
  const router = useRouter()
  const [customStatement, setCustomStatement] = useState<ReturnType<typeof getCustomStatementById>>(undefined)
  const [currentStep, setCurrentStep] = useState(0)
  const [selections, setSelections] = useState<Record<CriterionKey, ConditionStatus | null>>({
    decision_authority: null,
    access_to_alternatives: null,
    affordability: null,
    infrastructure_availability: null,
    enforcement_power: null,
  })
  const [showResult, setShowResult] = useState(false)
  const [userBasedResult, setUserBasedResult] = useState<ReturnType<typeof calculateVerdictFromUserSelections> | null>(
    null,
  )
  const [votes, setVotes] = useState<{ confirmMissing: number; confirmAvailable: number }>({
    confirmMissing: 0,
    confirmAvailable: 0,
  })
  const [userVoted, setUserVoted] = useState<string | null>(null)
  const [targetContext, setTargetContext] = useState<ReturnType<typeof getTargetGroupContext> | null>(null)

  useEffect(() => {
    const stmt = getCustomStatementById(customId)
    if (!stmt) {
      router.push("/analyze")
      return
    }
    setCustomStatement(stmt)
    setTargetContext(getTargetGroupContext(stmt.targetGroup))

    const existingVotes = getVotesForCustomStatement(customId)
    setVotes(existingVotes)
  }, [customId, router])

  if (!customStatement) {
    return (
      <main className="min-h-screen bg-[#f5f3ef] flex items-center justify-center">
        <p>Loading...</p>
      </main>
    )
  }

  const currentCriterion = CRITERIA_ORDER[currentStep]
  const progress = ((currentStep + 1) / CRITERIA_ORDER.length) * 100

  const handleSelection = (value: ConditionStatus) => {
    setSelections((prev) => ({
      ...prev,
      [currentCriterion]: value,
    }))
  }

  const handleNext = () => {
    if (currentStep < CRITERIA_ORDER.length - 1) {
      setCurrentStep((prev) => prev + 1)
    } else {
      calculateAndSaveResults()
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  const handleVote = (voteType: "confirmMissing" | "confirmAvailable") => {
    if (userVoted) return

    saveCustomVote(customId, voteType)
    setVotes((prev) => ({
      ...prev,
      [voteType]: prev[voteType] + 1,
    }))
    setUserVoted(voteType)
  }

  const calculateAndSaveResults = () => {
    const result = calculateVerdictFromUserSelections(selections)
    setUserBasedResult(result)

    const userSelections: UserSelection[] = CRITERIA_ORDER.map((criterion) => ({
      criterion,
      userChoice: selections[criterion] || "not_available",
      isCorrect: true, // User's assessment is always "correct" for their context
    }))

    // Map verdict to display label
    const verdictLabel =
      result.verdict === "structurally_dishonest"
        ? "GREEN LIE"
        : result.verdict === "partially_valid"
          ? "PARTIALLY VALID"
          : "STRUCTURALLY HONEST"

    updateCustomStatementAnalysis(customId, {
      missingConditions: result.missingConditions,
      verdict: verdictLabel,
      criteriaAssessment: {} as any,
    })
    const uniqueAnalysisId = `analysis_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`

    saveAnalysis({
      id: uniqueAnalysisId,
      statementId: customId,
      statement: customStatement.statement,
      targetGroup: customStatement.targetGroup,
      sourceType: customStatement.sourceType,
      userSelections,
      missingConditions: result.missingConditions,
      verdict: verdictLabel,
      timestamp: Date.now(),
    })

    setShowResult(true)
  }

  if (showResult && userBasedResult) {
    const { verdict, missingConditions, partialConditions, availableConditions, probability, reasoning, statistics } =
      userBasedResult
    const makeItHonestSuggestions = generateMakeItHonestSuggestions(
      customStatement.statement,
      customStatement.targetGroup,
      missingConditions,
    )
    const actionableSuggestions = generateActionableSuggestions(missingConditions)

    let verdictLabel: string
    let verdictColor: string
    let verdictBg: string

    if (verdict === "structurally_dishonest") {
      verdictLabel = "GREEN LIE"
      verdictColor = "text-red-700"
      verdictBg = "bg-red-50 border-red-200"
    } else if (verdict === "partially_valid") {
      verdictLabel = "PARTIALLY VALID"
      verdictColor = "text-amber-700"
      verdictBg = "bg-amber-50 border-amber-200"
    } else {
      verdictLabel = "STRUCTURALLY HONEST"
      verdictColor = "text-emerald-700"
      verdictBg = "bg-emerald-50 border-emerald-200"
    }

    const totalVotes = votes.confirmMissing + votes.confirmAvailable

    return (
      <main className="min-h-screen bg-[#f5f3ef]">
        <header className="container mx-auto px-4 py-6">
          <Link href="/" className="flex items-center gap-2 w-fit">
            <div className="p-2 bg-[#4a9a8e] rounded-lg">
              <Scale className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-[#4a9a8e]">Green Lie Detector</span>
          </Link>
        </header>

        <section className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
          {/* Main Verdict Card */}
          <Card className={`border ${verdictBg}`}>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4">
                {verdict === "structurally_dishonest" ? (
                  <div className="p-4 bg-red-100 rounded-full inline-block">
                    <X className="h-12 w-12 text-red-600" />
                  </div>
                ) : verdict === "partially_valid" ? (
                  <div className="p-4 bg-amber-100 rounded-full inline-block">
                    <AlertTriangle className="h-12 w-12 text-amber-600" />
                  </div>
                ) : (
                  <div className="p-4 bg-emerald-100 rounded-full inline-block">
                    <CheckCircle className="h-12 w-12 text-emerald-600" />
                  </div>
                )}
              </div>
              <CardTitle className={`text-3xl font-bold ${verdictColor}`}>{verdictLabel}</CardTitle>
              <div className="mt-2">
                <span className="text-sm text-gray-600">Structural Honesty Probability:</span>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <div className="w-32 h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${probability >= 70 ? "bg-emerald-500" : probability >= 40 ? "bg-amber-500" : "bg-red-500"}`}
                      style={{ width: `${probability}%` }}
                    />
                  </div>
                  <span
                    className={`font-bold ${probability >= 70 ? "text-emerald-600" : probability >= 40 ? "text-amber-600" : "text-red-600"}`}
                  >
                    {probability}%
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-white rounded-lg border">
                <p className="font-medium text-gray-900 mb-2">Statement Analyzed:</p>
                <p className="text-gray-700 italic">&quot;{customStatement.statement}&quot;</p>
                <div className="flex gap-2 mt-3 text-xs">
                  <span className="px-2 py-1 bg-[#4a9a8e]/10 text-[#4a9a8e] rounded">
                    Target: {customStatement.targetGroup}
                  </span>
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded">
                    Source: {customStatement.sourceType}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-blue-900 mb-1">Analysis Reasoning</p>
                    <p className="text-sm text-blue-800">{reasoning}</p>
                  </div>
                </div>
              </div>

              <Card className="border-gray-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-[#4a9a8e]" />
                    Statistical Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold text-gray-900">{statistics.totalConditions}</p>
                      <p className="text-xs text-gray-600">Total Conditions</p>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <p className="text-2xl font-bold text-red-600">{statistics.missingCount}</p>
                      <p className="text-xs text-red-700">Missing</p>
                    </div>
                    <div className="text-center p-3 bg-amber-50 rounded-lg">
                      <p className="text-2xl font-bold text-amber-600">{statistics.partialCount}</p>
                      <p className="text-xs text-amber-700">Partial</p>
                    </div>
                    <div className="text-center p-3 bg-emerald-50 rounded-lg">
                      <p className="text-2xl font-bold text-emerald-600">{statistics.availableCount}</p>
                      <p className="text-xs text-emerald-700">Available</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Honesty Score</span>
                      <span className="font-medium">{statistics.honestyScore}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${statistics.honestyScore >= 70 ? "bg-emerald-500" : statistics.honestyScore >= 40 ? "bg-amber-500" : "bg-red-500"}`}
                        style={{ width: `${statistics.honestyScore}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Condition Assessment - based on user selections */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Your Assessment for {customStatement.targetGroup}:</h3>
                <div className="space-y-2">
                  {CRITERIA_ORDER.map((criterion) => {
                    const status = selections[criterion]
                    return (
                      <div
                        key={criterion}
                        className={`p-3 rounded-lg border flex items-center justify-between ${
                          status === "not_available"
                            ? "bg-red-50 border-red-200"
                            : status === "partially_available"
                              ? "bg-amber-50 border-amber-200"
                              : "bg-emerald-50 border-emerald-200"
                        }`}
                      >
                        <span className="font-medium text-gray-800">{CRITERIA_LABELS[criterion]}</span>
                        <span
                          className={`text-sm font-medium px-2 py-1 rounded whitespace-nowrap ${
                            status === "not_available"
                              ? "bg-red-200 text-red-800"
                              : status === "partially_available"
                                ? "bg-amber-200 text-amber-800"
                                : "bg-emerald-200 text-emerald-800"
                          }`}
                        >
                          {status === "not_available"
                            ? "Missing"
                            : status === "partially_available"
                              ? "Partial"
                              : "Available"}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Make It Honest Suggestions - only show if there are missing conditions */}
          {missingConditions.length > 0 && (
            <Card className="border-[#4a9a8e]/30 bg-gradient-to-br from-[#4a9a8e]/5 to-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[#4a9a8e]">
                  <Lightbulb className="h-5 w-5" />
                  Make It Honest - Suggestion Engine
                </CardTitle>
                <CardDescription>
                  Constructive actions to transform this statement into structurally honest policy
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {makeItHonestSuggestions.map((suggestion, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3 bg-white rounded-lg border border-[#4a9a8e]/20"
                    >
                      <div className="p-1 bg-[#4a9a8e]/10 rounded">
                        <CheckCircle className="h-4 w-4 text-[#4a9a8e]" />
                      </div>
                      <p className="text-gray-700 text-sm">{suggestion}</p>
                    </div>
                  ))}
                </div>

                {Object.keys(actionableSuggestions).length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm font-medium text-gray-700 mb-2">General Recommendations:</p>
                    <ul className="space-y-2">
                      {Object.entries(actionableSuggestions).map(([key, suggestion]) => (
                        <li key={key} className="text-sm text-gray-600 flex items-start gap-2">
                          <span className="text-[#4a9a8e]">•</span>
                          <span>
                            <strong>{CRITERIA_LABELS[key as CriterionKey]}:</strong> {suggestion}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className="text-xs text-gray-500 mt-4 italic">
                  Use these suggestions to advocate for systemic change rather than individual blame.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Youth Voice Amplification */}
          <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-700">
                <Users className="h-5 w-5" />
                Youth Voice Amplification
              </CardTitle>
              <CardDescription>
                Validate this analysis with your lived experience. Your voice creates collective advocacy data.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <p className="text-sm text-gray-700 mb-3">
                  Do you personally experience these missing conditions in your environment?
                </p>
                <div className="flex gap-3">
                  <Button
                    variant={userVoted === "confirmMissing" ? "default" : "outline"}
                    className={
                      userVoted === "confirmMissing"
                        ? "bg-red-600 hover:bg-red-700 text-white flex-1"
                        : "border-red-300 text-red-700 hover:bg-red-50 flex-1"
                    }
                    onClick={() => handleVote("confirmMissing")}
                    disabled={!!userVoted}
                  >
                    <ThumbsDown className="h-4 w-4 mr-2" />
                    Yes, conditions are missing
                  </Button>
                  <Button
                    variant={userVoted === "confirmAvailable" ? "default" : "outline"}
                    className={
                      userVoted === "confirmAvailable"
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white flex-1"
                        : "border-emerald-300 text-emerald-700 hover:bg-emerald-50 flex-1"
                    }
                    onClick={() => handleVote("confirmAvailable")}
                    disabled={!!userVoted}
                  >
                    <ThumbsUp className="h-4 w-4 mr-2" />
                    No, conditions exist
                  </Button>
                </div>
              </div>

              {totalVotes > 0 && (
                <div className="p-3 bg-white rounded-lg border">
                  <p className="text-sm font-medium text-gray-900 mb-2">Community Validation:</p>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-500 transition-all"
                          style={{ width: `${totalVotes > 0 ? (votes.confirmMissing / totalVotes) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      {votes.confirmMissing} of {totalVotes} confirm missing
                    </span>
                  </div>
                  <p className="text-xs text-purple-600 mt-2 font-medium">
                    {votes.confirmMissing} people confirm these conditions are missing in their environment
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex gap-4">
            <Link href="/analyze" className="flex-1">
              <Button variant="outline" className="w-full border-[#4a9a8e] text-[#4a9a8e] bg-transparent">
                Analyze Another
              </Button>
            </Link>
            <Link href="/insights" className="flex-1">
              <Button className="w-full bg-[#4a9a8e] hover:bg-[#3d8275] text-white">
                <BarChart3 className="h-4 w-4 mr-2" />
                View All Patterns
              </Button>
            </Link>
          </div>
        </section>

        <footer className="bg-gray-900 text-white py-8 mt-16">
          <div className="container mx-auto px-4 text-center">
            <p className="text-gray-400 text-sm">
              Green Lie Detector — Structural Accountability Analyzer for Sustainability Claims
            </p>
          </div>
        </footer>
      </main>
    )
  }

  // Evaluation step UI
  return (
    <main className="min-h-screen bg-[#f5f3ef]">
      <header className="container mx-auto px-4 py-6">
        <Link href="/" className="flex items-center gap-2 w-fit">
          <div className="p-2 bg-[#4a9a8e] rounded-lg">
            <Scale className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-[#4a9a8e]">Green Lie Detector</span>
        </Link>
      </header>

      <section className="container mx-auto px-4 py-8 max-w-3xl">
        <Link href="/analyze" className="inline-flex items-center text-[#4a9a8e] hover:text-[#3d8275] mb-6">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Statements
        </Link>

        {/* Statement being analyzed */}
        <Card className="mb-6 border-[#4a9a8e]/20 bg-white">
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500 mb-2">Analyzing:</p>
            <p className="font-medium text-gray-900">&quot;{customStatement.statement}&quot;</p>
            <div className="flex gap-2 mt-3 text-xs">
              <span className="px-2 py-1 bg-[#4a9a8e]/10 text-[#4a9a8e] rounded">
                Target: {customStatement.targetGroup}
              </span>
              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded">Source: {customStatement.sourceType}</span>
            </div>
          </CardContent>
        </Card>

        {/* Target Group Context */}
        {targetContext && (
          <Card className="mb-6 border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-blue-900 mb-1">Context: {customStatement.targetGroup}</p>
                  <p className="text-sm text-blue-800">{targetContext.contextNote}</p>
                  <p className="text-xs text-blue-600 mt-2">
                    Structural power level:{" "}
                    <span
                      className={`font-semibold ${targetContext.powerLevel === "high" ? "text-emerald-600" : targetContext.powerLevel === "medium" ? "text-amber-600" : "text-red-600"}`}
                    >
                      {targetContext.powerLevel.toUpperCase()}
                    </span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>
              Condition {currentStep + 1} of {CRITERIA_ORDER.length}
            </span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Current Criterion */}
        <Card className="border-[#4a9a8e]/20 bg-white">
          <CardHeader>
            <CardTitle className="text-xl text-gray-900">{CRITERIA_LABELS[currentCriterion]}</CardTitle>
            <CardDescription className="text-base">{CRITERIA_QUESTIONS[currentCriterion]}</CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={selections[currentCriterion] || ""}
              onValueChange={(value) => handleSelection(value as ConditionStatus)}
              className="space-y-3"
            >
              <div className="flex items-start space-x-3">
                <RadioGroupItem value="available" id="available" className="mt-1 border-emerald-500 text-emerald-500" />
                <Label
                  htmlFor="available"
                  className={`flex-1 cursor-pointer p-4 rounded-lg border transition-colors ${
                    selections[currentCriterion] === "available"
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-gray-200 hover:border-emerald-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-emerald-600" />
                    <span className="font-medium text-gray-900">Yes, Available</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {customStatement.targetGroup} has full access to this condition.
                  </p>
                </Label>
              </div>

              <div className="flex items-start space-x-3">
                <RadioGroupItem
                  value="partially_available"
                  id="partial"
                  className="mt-1 border-amber-500 text-amber-500"
                />
                <Label
                  htmlFor="partial"
                  className={`flex-1 cursor-pointer p-4 rounded-lg border transition-colors ${
                    selections[currentCriterion] === "partially_available"
                      ? "border-amber-500 bg-amber-50"
                      : "border-gray-200 hover:border-amber-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    <span className="font-medium text-gray-900">Partially Available</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {customStatement.targetGroup} has limited or inconsistent access.
                  </p>
                </Label>
              </div>

              <div className="flex items-start space-x-3">
                <RadioGroupItem value="not_available" id="not_available" className="mt-1 border-red-500 text-red-500" />
                <Label
                  htmlFor="not_available"
                  className={`flex-1 cursor-pointer p-4 rounded-lg border transition-colors ${
                    selections[currentCriterion] === "not_available"
                      ? "border-red-500 bg-red-50"
                      : "border-gray-200 hover:border-red-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <X className="h-5 w-5 text-red-600" />
                    <span className="font-medium text-gray-900">No, Not Available</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {customStatement.targetGroup} lacks access to this condition.
                  </p>
                </Label>
              </div>
            </RadioGroup>

            <div className="flex justify-between mt-6">
              <Button
                variant="outline"
                onClick={handlePrev}
                disabled={currentStep === 0}
                className="border-gray-300 bg-transparent"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              <Button
                onClick={handleNext}
                disabled={!selections[currentCriterion]}
                className="bg-[#4a9a8e] hover:bg-[#3d8275] text-white"
              >
                {currentStep === CRITERIA_ORDER.length - 1 ? "Get Verdict" : "Next"}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
