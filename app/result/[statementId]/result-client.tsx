"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Leaf,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  BarChart3,
  Lightbulb,
  Users,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react"
import { getStatementById, calculateVerdict, generateActionableSuggestions } from "@/lib/evaluation-engine"
import { saveAnalysis, saveVote, getVotesForStatement } from "@/lib/storage"
import type { CriterionKey, UserSelection, AnalysisResult, StoredAnalysis } from "@/lib/types"
import { CRITERIA_LABELS } from "@/lib/types"

export default function ResultClient({ statementId }: { statementId: string }) {
  const [statement, setStatement] = useState<ReturnType<typeof getStatementById>>(null)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [votes, setVotes] = useState<Record<CriterionKey, { missing: number; available: number }> | null>(null)
  const [votedCriteria, setVotedCriteria] = useState<Set<CriterionKey>>(new Set())
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadedStatement = getStatementById(statementId)
    setStatement(loadedStatement)

    if (!loadedStatement) {
      setIsLoading(false)
      return
    }

    const stored = sessionStorage.getItem("analysisResult")
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (parsed.statementId === statementId) {
          const analysisResult = calculateVerdict(loadedStatement, parsed.userSelections as UserSelection[])
          setResult(analysisResult)
          const uniqueAnalysisId = `analysis_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`

          const storedAnalysis: StoredAnalysis = {
            id: uniqueAnalysisId,
            statementId: loadedStatement.id,
            statement: loadedStatement.statement,
            targetGroup: loadedStatement.target_group,
            sourceType: loadedStatement.source_type,
            userSelections: parsed.userSelections,
            missingConditions: analysisResult.missingConditions,
            verdict: loadedStatement.verdict,
            timestamp: Date.now(),
          }
          saveAnalysis(storedAnalysis)
        } else {
          const factResult = calculateVerdict(loadedStatement, [])
          setResult(factResult)
        }
      } catch {
        const factResult = calculateVerdict(loadedStatement, [])
        setResult(factResult)
      }
    } else {
      const factResult = calculateVerdict(loadedStatement, [])
      setResult(factResult)
    }

    setVotes(getVotesForStatement(statementId))
    setIsLoading(false)
  }, [statementId])

  const handleVote = (criterion: CriterionKey, voteType: "missing" | "available") => {
    if (votedCriteria.has(criterion)) return

    saveVote(statementId, criterion, voteType)
    setVotedCriteria((prev) => new Set(prev).add(criterion))
    setVotes(getVotesForStatement(statementId))
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-gray-600">Loading analysis...</p>
          </CardContent>
        </Card>
      </main>
    )
  }

  if (!statement || !result) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-gray-600">Statement not found.</p>
            <Link href="/analyze">
              <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white">Go Back</Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    )
  }

  const isGreenLie = result.verdict === "structurally_dishonest"
  const isPartiallyValid = result.verdict === "partially_valid"
  const suggestions = generateActionableSuggestions(result.missingConditions)

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      <header className="container mx-auto px-4 py-6">
        <Link href="/" className="flex items-center gap-2 w-fit">
          <div className="p-2 bg-emerald-600 rounded-lg">
            <Leaf className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-emerald-800">Green Lie Detector</span>
        </Link>
      </header>

      <section className="container mx-auto px-4 py-8 max-w-4xl">
        <Card
          className={`mb-6 border-2 ${
            isGreenLie
              ? "border-red-300 bg-red-50"
              : isPartiallyValid
                ? "border-amber-300 bg-amber-50"
                : "border-emerald-300 bg-emerald-50"
          }`}
        >
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              {isGreenLie ? (
                <div className="p-4 bg-red-100 rounded-full">
                  <XCircle className="h-12 w-12 text-red-600" />
                </div>
              ) : isPartiallyValid ? (
                <div className="p-4 bg-amber-100 rounded-full">
                  <AlertTriangle className="h-12 w-12 text-amber-600" />
                </div>
              ) : (
                <div className="p-4 bg-emerald-100 rounded-full">
                  <CheckCircle2 className="h-12 w-12 text-emerald-600" />
                </div>
              )}
            </div>
            <CardTitle
              className={`text-2xl ${isGreenLie ? "text-red-800" : isPartiallyValid ? "text-amber-800" : "text-emerald-800"}`}
            >
              {isGreenLie
                ? "Structurally Dishonest Statement"
                : isPartiallyValid
                  ? "Partially Valid But Misleading"
                  : "Structurally Honest Statement"}
            </CardTitle>
            <CardDescription className="text-base mt-2">
              {isGreenLie
                ? "This statement assigns responsibility without providing the required conditions."
                : isPartiallyValid
                  ? "This statement has some validity but ignores important structural barriers."
                  : "All required conditions exist for the target group to act."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-white/60 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600 mb-1">Statement Analyzed:</p>
              <p className="font-semibold text-gray-900">&quot;{statement.statement}&quot;</p>
            </div>

            <div
              className={`p-4 rounded-lg ${isGreenLie ? "bg-red-100" : isPartiallyValid ? "bg-amber-100" : "bg-emerald-100"}`}
            >
              <p
                className={`text-sm font-medium ${isGreenLie ? "text-red-800" : isPartiallyValid ? "text-amber-800" : "text-emerald-800"}`}
              >
                Key Insight:
              </p>
              <p
                className={`text-sm ${isGreenLie ? "text-red-700" : isPartiallyValid ? "text-amber-700" : "text-emerald-700"}`}
              >
                {isGreenLie || isPartiallyValid
                  ? "Responsibility without power creates false accountability."
                  : "When conditions align with responsibility, meaningful action is possible."}
              </p>
            </div>
          </CardContent>
        </Card>

        {result.missingConditions.length > 0 && (
          <Card className="mb-6 border-emerald-100">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                Missing Conditions ({result.missingConditions.length})
              </CardTitle>
              <CardDescription>
                These conditions are not available to {statement.target_group}, making the statement unfair.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {result.missingConditions.map((criterion) => (
                  <div key={criterion} className="p-4 bg-red-50 rounded-lg border border-red-100">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-medium text-red-800">{CRITERIA_LABELS[criterion]}</p>
                        <p className="text-sm text-red-600 mt-1">
                          {statement.criteria_assessment[criterion].explanation}
                        </p>
                      </div>
                      <Badge variant="destructive" className="shrink-0">
                        Not Available
                      </Badge>
                    </div>

                    <div className="mt-4 pt-3 border-t border-red-200">
                      <p className="text-xs text-gray-600 mb-2 flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        Do you personally experience this missing condition?
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className={`text-xs ${votedCriteria.has(criterion) ? "opacity-50" : "hover:bg-red-100"}`}
                          onClick={() => handleVote(criterion, "missing")}
                          disabled={votedCriteria.has(criterion)}
                        >
                          <ThumbsUp className="h-3 w-3 mr-1" />
                          Yes, it&apos;s missing ({votes?.[criterion]?.missing || 0})
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className={`text-xs ${votedCriteria.has(criterion) ? "opacity-50" : "hover:bg-emerald-100"}`}
                          onClick={() => handleVote(criterion, "available")}
                          disabled={votedCriteria.has(criterion)}
                        >
                          <ThumbsDown className="h-3 w-3 mr-1" />I have access ({votes?.[criterion]?.available || 0})
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="mb-6 border-emerald-100">
          <CardHeader>
            <CardTitle className="text-lg">Detailed Reasoning</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 leading-relaxed">{statement.reasoning}</p>
          </CardContent>
        </Card>

        {(isGreenLie || isPartiallyValid) && (
          <Card className="mb-6 border-emerald-200 bg-emerald-50/30">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-emerald-800">
                <Lightbulb className="h-5 w-5" />
                How to Make This Honest
              </CardTitle>
              <CardDescription>Instead of shifting blame, here&apos;s what institutions SHOULD do:</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {statement.actionable_suggestions.map((suggestion, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-emerald-100">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-700">{suggestion}</p>
                  </div>
                ))}
              </div>

              {Object.keys(suggestions).length > 0 && (
                <div className="mt-6 pt-4 border-t border-emerald-200">
                  <p className="text-sm font-medium text-emerald-800 mb-3">Based on missing conditions:</p>
                  <div className="space-y-2">
                    {Object.entries(suggestions).map(([key, suggestion]) => (
                      <div key={key} className="flex items-start gap-2 text-sm">
                        <ArrowRight className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="text-gray-600">
                          <strong className="text-emerald-700">{CRITERIA_LABELS[key as CriterionKey]}:</strong>{" "}
                          {suggestion}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="mb-6 border-gray-200 bg-gray-50">
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600 italic text-center">
              &quot;When sustainability messages ignore missing conditions, responsibility shifts unfairly. Structural
              honesty ensures real change.&quot;
            </p>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/analyze">
            <Button variant="outline" className="w-full sm:w-auto bg-transparent">
              Analyze Another Statement
            </Button>
          </Link>
          <Link href="/insights">
            <Button className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white">
              <BarChart3 className="h-4 w-4 mr-2" />
              View Patterns & Insights
            </Button>
          </Link>
        </div>
      </section>

      <footer className="bg-gray-900 text-white py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-400 text-sm">
            Green Lie Detector — Structural Honesty Analyzer for Sustainability Claims
          </p>
        </div>
      </footer>
    </main>
  )
}
