"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ArrowLeft, ArrowRight, Leaf, CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react"
import { getStatementById, getCorrectionFeedback } from "@/lib/evaluation-engine"
import type { CriterionKey, ConditionStatus, UserSelection } from "@/lib/types"
import { CRITERIA_LABELS, CRITERIA_QUESTIONS } from "@/lib/types"

const CRITERIA_ORDER: CriterionKey[] = [
  "decision_authority",
  "access_to_alternatives",
  "affordability",
  "infrastructure_availability",
  "enforcement_power",
]

export default function EvaluateClient({ statementId }: { statementId: string }) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [statement, setStatement] = useState<ReturnType<typeof getStatementById>>(null)

  const [currentStep, setCurrentStep] = useState(0)
  const [selections, setSelections] = useState<Partial<Record<CriterionKey, ConditionStatus>>>({})
  const [feedback, setFeedback] = useState<{
    isCorrect: boolean
    explanation: string
    examples: { positive: string[]; negative: string[] }
  } | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)

  useEffect(() => {
    setMounted(true)
    setStatement(getStatementById(statementId))
  }, [statementId])

  if (!mounted) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-gray-600">Loading...</p>
          </CardContent>
        </Card>
      </main>
    )
  }

  if (!statement) {
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

  const currentCriterion = CRITERIA_ORDER[currentStep]
  const isLastStep = currentStep === CRITERIA_ORDER.length - 1

  const handleSelection = (value: ConditionStatus) => {
    setSelections((prev) => ({ ...prev, [currentCriterion]: value }))

    const fb = getCorrectionFeedback(statement, currentCriterion, value)
    setFeedback(fb)
    setShowFeedback(true)
  }

  const handleNext = () => {
    setShowFeedback(false)
    setFeedback(null)

    if (isLastStep) {
      const userSelections: UserSelection[] = CRITERIA_ORDER.map((criterion) => {
        const userChoice = selections[criterion] || "available"
        const correctStatus = statement.criteria_assessment[criterion].status
        return {
          criterion,
          userChoice,
          isCorrect: userChoice === correctStatus,
        }
      })

      sessionStorage.setItem(
        "analysisResult",
        JSON.stringify({
          statementId: statement.id,
          userSelections,
        }),
      )

      router.push(`/result/${statement.id}`)
    } else {
      setCurrentStep((prev) => prev + 1)
    }
  }

  const handleBack = () => {
    setShowFeedback(false)
    setFeedback(null)
    setCurrentStep((prev) => prev - 1)
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <Link href="/" className="flex items-center gap-2 w-fit">
          <div className="p-2 bg-emerald-600 rounded-lg">
            <Leaf className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-emerald-800">Green Lie Detector</span>
        </Link>
      </header>

      {/* Main Content */}
      <section className="container mx-auto px-4 py-8 max-w-3xl">
        <Link href="/analyze" className="inline-flex items-center text-emerald-600 hover:text-emerald-700 mb-6">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Choose Different Statement
        </Link>

        {/* Statement Being Analyzed */}
        <Card className="mb-6 border-emerald-200 bg-emerald-50/50">
          <CardContent className="pt-6">
            <p className="text-sm text-emerald-600 mb-1 font-medium">Analyzing Statement:</p>
            <p className="text-lg font-semibold text-gray-900">&quot;{statement.statement}&quot;</p>
            <div className="flex gap-2 mt-3 text-xs">
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded">
                Target: {statement.target_group}
              </span>
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded">Source: {statement.source_type}</span>
            </div>
          </CardContent>
        </Card>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>
              Condition {currentStep + 1} of {CRITERIA_ORDER.length}
            </span>
            <span>{CRITERIA_LABELS[currentCriterion]}</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-600 transition-all duration-300"
              style={{ width: `${((currentStep + 1) / CRITERIA_ORDER.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Condition Card */}
        <Card className="border-emerald-100">
          <CardHeader>
            <CardTitle className="text-xl text-gray-900">{CRITERIA_LABELS[currentCriterion]}</CardTitle>
            <CardDescription className="text-base">{CRITERIA_QUESTIONS[currentCriterion]}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-6">
              Consider whether <strong>{statement.target_group}</strong> realistically have this condition available to
              them.
            </p>

            {/* Selection Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
              <Button
                variant="outline"
                className={`h-auto py-4 flex flex-col gap-1 ${
                  selections[currentCriterion] === "available"
                    ? "bg-emerald-100 border-emerald-500 !text-emerald-900 hover:bg-emerald-200 [&_svg]:!text-emerald-900"
                    : "!text-slate-900 hover:border-emerald-300 hover:bg-emerald-50"
                }`}
                onClick={() => handleSelection("available")}
              >
                <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium !text-current">Available</span>
                  <span className="text-xs !text-current/80">Fully accessible</span>
              </Button>

              <Button
                variant="outline"
                className={`h-auto py-4 flex flex-col gap-1 ${
                  selections[currentCriterion] === "partially_available"
                    ? "bg-amber-100 border-amber-500 !text-amber-900 hover:bg-amber-200 [&_svg]:!text-amber-900"
                    : "!text-slate-900 hover:border-amber-300 hover:bg-amber-50"
                }`}
                onClick={() => handleSelection("partially_available")}
              >
                <AlertTriangle className="h-5 w-5" />
                  <span className="font-medium !text-current">Partial</span>
                  <span className="text-xs !text-current/80">Limited access</span>
              </Button>

              <Button
                variant="outline"
                className={`h-auto py-4 flex flex-col gap-1 ${
                  selections[currentCriterion] === "not_available"
                    ? "bg-red-100 border-red-500 !text-red-900 hover:bg-red-200 [&_svg]:!text-red-900"
                    : "!text-slate-900 hover:border-red-300 hover:bg-red-50"
                }`}
                onClick={() => handleSelection("not_available")}
              >
                <XCircle className="h-5 w-5" />
                  <span className="font-medium !text-current">Not Available</span>
                  <span className="text-xs !text-current/80">Inaccessible</span>
              </Button>
            </div>

            {/* Feedback Section */}
            {showFeedback && feedback && (
              <Alert
                className={feedback.isCorrect ? "border-emerald-300 bg-emerald-50" : "border-amber-300 bg-amber-50"}
              >
                <Info className={`h-4 w-4 ${feedback.isCorrect ? "text-emerald-600" : "text-amber-600"}`} />
                <AlertTitle className={feedback.isCorrect ? "text-emerald-800" : "text-amber-800"}>
                  {feedback.isCorrect ? "Your assessment aligns with the facts!" : "Consider this information:"}
                </AlertTitle>
                <AlertDescription className="mt-2">
                  <p className={`text-sm ${feedback.isCorrect ? "text-emerald-700" : "text-amber-700"}`}>
                    {feedback.explanation}
                  </p>

                  {!feedback.isCorrect && (
                    <div className="mt-4 space-y-3">
                      {feedback.examples.negative.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-red-600 mb-1">Why it&apos;s often NOT available:</p>
                          <ul className="text-xs text-gray-600 list-disc list-inside space-y-1">
                            {feedback.examples.negative.slice(0, 2).map((ex, i) => (
                              <li key={i}>{ex}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {feedback.examples.positive.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-emerald-600 mb-1">When it CAN be available:</p>
                          <ul className="text-xs text-gray-600 list-disc list-inside space-y-1">
                            {feedback.examples.positive.slice(0, 2).map((ex, i) => (
                              <li key={i}>{ex}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={handleBack} disabled={currentStep === 0}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>

              <Button
                onClick={handleNext}
                disabled={!selections[currentCriterion]}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isLastStep ? "See Verdict" : "Next Condition"}
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
