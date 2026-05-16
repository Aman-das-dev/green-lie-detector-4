"use client"

import { Suspense, useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Scale, BarChart3, PieChart, TrendingUp, ArrowLeft, Users, AlertTriangle, CheckCircle2 } from "lucide-react"
import { getVotes, getAnalyses } from "@/lib/storage"
import { getAllAnalyzedStatements } from "@/lib/custom-statements"
import type { CriterionKey } from "@/lib/types"
import { CRITERIA_LABELS } from "@/lib/types"
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

const COLORS = {
  teal: "#4a9a8e",
  coral: "#e07a5f",
  amber: "#f2cc8f",
  navy: "#3d405b",
  sage: "#81b29a",
  red: "#e63946",
  green: "#2a9d8f",
  orange: "#f4a261",
}

function InsightsContent() {
  const [totalVotes, setTotalVotes] = useState(0)
  const [analyses, setAnalyses] = useState<ReturnType<typeof getAnalyses>>([])
  const [customAnalyzed, setCustomAnalyzed] = useState<ReturnType<typeof getAllAnalyzedStatements>>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setTotalVotes(getVotes().length)
    setAnalyses(getAnalyses())
    setCustomAnalyzed(getAllAnalyzedStatements())
  }, [])

  const dynamicStats = useMemo(() => {
    const emptyStats = {
      totalStatements: 0,
      greenLies: 0,
      partiallyValid: 0,
      honest: 0,
      conditionFrequency: {
        enforcement_power: 0,
        infrastructure_availability: 0,
        affordability: 0,
        decision_authority: 0,
        access_to_alternatives: 0,
      } as Record<CriterionKey, number>,
      sourceBreakdown: {} as Record<string, { total: number; dishonest: number; honest: number }>,
      totalAnalyses: 0,
      analyzedStatements: [] as Array<{
        id: string
        statement: string
        targetGroup: string
        sourceType: string
        verdict: string
        isCustom: boolean
        linkPath: string
        missingConditions: CriterionKey[]
      }>,
    }

    if (!mounted) return emptyStats

    const normalizeVerdict = (verdict: string) => {
      const normalized = verdict.toUpperCase().trim()
      if (normalized === "GREEN LIE" || normalized === "STRUCTURALLY_DISHONEST") return "GREEN_LIE"
      if (normalized === "PARTIALLY VALID" || normalized === "PARTIALLY_VALID" || normalized.includes("MISLEADING")) {
        return "PARTIALLY_VALID"
      }
      return "STRUCTURALLY_HONEST"
    }

    const analyzedStatements = [
      ...analyses.map((a) => ({
        id: a.id,
        statement: a.statement,
        targetGroup: a.targetGroup,
        sourceType: a.sourceType,
        verdict: a.verdict,
        isCustom: false,
        linkPath: `/result/${a.statementId}`,
        missingConditions: a.missingConditions,
      })),
      ...customAnalyzed.map((s) => ({
        id: s.id,
        statement: s.statement,
        targetGroup: s.targetGroup,
        sourceType: s.sourceType,
        verdict: s.verdict,
        isCustom: true,
        linkPath: `/analyze/custom/${s.id}`,
        missingConditions: s.missingConditions,
      })),
    ]

    const totalStatements = analyzedStatements.length
    const greenLies = analyzedStatements.filter((s) => normalizeVerdict(s.verdict) === "GREEN_LIE").length
    const partiallyValid = analyzedStatements.filter((s) => normalizeVerdict(s.verdict) === "PARTIALLY_VALID").length
    const honest = analyzedStatements.filter((s) => normalizeVerdict(s.verdict) === "STRUCTURALLY_HONEST").length

    const conditionFrequency: Record<CriterionKey, number> = {
      enforcement_power: 0,
      infrastructure_availability: 0,
      affordability: 0,
      decision_authority: 0,
      access_to_alternatives: 0,
    }

    analyzedStatements.forEach((stmt) => {
      stmt.missingConditions.forEach((c: CriterionKey) => {
        conditionFrequency[c]++
      })
    })

    const sourceBreakdown: Record<string, { total: number; dishonest: number; honest: number }> = {}
    analyzedStatements.forEach((s) => {
      if (!sourceBreakdown[s.sourceType]) {
        sourceBreakdown[s.sourceType] = { total: 0, dishonest: 0, honest: 0 }
      }
      sourceBreakdown[s.sourceType].total++
      if (normalizeVerdict(s.verdict) === "STRUCTURALLY_HONEST") {
        sourceBreakdown[s.sourceType].honest++
      } else {
        sourceBreakdown[s.sourceType].dishonest++
      }
    })

    return {
      totalStatements,
      greenLies,
      partiallyValid,
      honest,
      conditionFrequency,
      sourceBreakdown,
      totalAnalyses: totalStatements,
      analyzedStatements,
    }
  }, [mounted, analyses, customAnalyzed])

  const donutChartData = useMemo(
    () => [
      { name: "Green Lies", value: dynamicStats.greenLies, color: COLORS.red },
      { name: "Partially Valid", value: dynamicStats.partiallyValid, color: COLORS.amber },
      { name: "Structurally Honest", value: dynamicStats.honest, color: COLORS.green },
    ],
    [dynamicStats],
  )

  const barChartData = useMemo(
    () =>
      (Object.entries(dynamicStats.conditionFrequency) as [CriterionKey, number][])
        .sort(([, a], [, b]) => b - a)
        .map(([criterion, count]) => ({
          name: CRITERIA_LABELS[criterion].split(" ")[0],
          fullName: CRITERIA_LABELS[criterion],
          count,
          fill: count >= 4 ? COLORS.red : count >= 2 ? COLORS.orange : COLORS.sage,
        })),
    [dynamicStats],
  )

  const sourceBarData = useMemo(
    () =>
      Object.entries(dynamicStats.sourceBreakdown).map(([source, data]) => ({
        name: source,
        Dishonest: data.dishonest,
        Honest: data.honest,
      })),
    [dynamicStats],
  )

  const maxConditionCount = Math.max(...Object.values(dynamicStats.conditionFrequency), 1)

  if (!mounted) {
    return (
      <main className="min-h-screen bg-[#f5f3ef] flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-gray-600">Loading insights...</p>
          </CardContent>
        </Card>
      </main>
    )
  }

  const allStatementsForDisplay = dynamicStats.analyzedStatements

  const getVerdictStyle = (verdict: string) => {
    const normalizedVerdict = verdict.toUpperCase()
    if (normalizedVerdict === "GREEN LIE" || normalizedVerdict === "STRUCTURALLY_DISHONEST") {
      return {
        cardClass: "bg-red-50 border-red-100 hover:border-red-300",
        badgeClass: "bg-red-200 text-red-800",
      }
    } else if (normalizedVerdict.includes("PARTIALLY") || normalizedVerdict.includes("MISLEADING")) {
      return {
        cardClass: "bg-amber-50 border-amber-100 hover:border-amber-300",
        badgeClass: "bg-amber-200 text-amber-800",
      }
    }
    return {
      cardClass: "bg-emerald-50 border-emerald-100 hover:border-emerald-300",
      badgeClass: "bg-emerald-200 text-emerald-800",
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f3ef]">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <Link href="/" className="flex items-center gap-2 w-fit">
          <div className="p-2 bg-[#4a9a8e] rounded-lg">
            <Scale className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-[#4a9a8e]">Green Lie Detector</span>
        </Link>
      </header>

      {/* Main Content */}
      <section className="container mx-auto px-4 py-8 max-w-6xl">
        <Link href="/" className="inline-flex items-center text-[#4a9a8e] hover:text-[#3d8275] mb-6">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Home
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Patterns in Green Messaging</h1>
          <p className="text-gray-600">
            Aggregated insights from {dynamicStats.totalStatements} sustainability statements. Charts update dynamically
            as you analyze more statements.
          </p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-[#4a9a8e]/20 bg-white">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#4a9a8e]/10 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-[#4a9a8e]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{dynamicStats.totalStatements}</p>
                  <p className="text-xs text-gray-600">Statements Analyzed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-white">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">{dynamicStats.greenLies}</p>
                  <p className="text-xs text-gray-600">Green Lies Detected</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#2a9d8f]/20 bg-white">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#2a9d8f]/10 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-[#2a9d8f]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#2a9d8f]">{dynamicStats.honest}</p>
                  <p className="text-xs text-gray-600">Structurally Honest</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#4a9a8e]/20 bg-white">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#4a9a8e]/10 rounded-lg">
                  <Users className="h-5 w-5 text-[#4a9a8e]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{totalVotes + dynamicStats.totalAnalyses}</p>
                  <p className="text-xs text-gray-600">User Validations</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Donut Chart - Verdict Distribution */}
          <Card className="border-[#4a9a8e]/20 bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <PieChart className="h-5 w-5 text-[#4a9a8e]" />
                Verdict Distribution
              </CardTitle>
              <CardDescription>Breakdown of structural honesty across all analyzed statements</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={donutChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => (percent > 0 ? `${name} ${(percent * 100).toFixed(0)}%` : "")}
                      labelLine={false}
                    >
                      {donutChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [value, "Statements"]}
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                      }}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 mt-4">
                {donutChartData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-gray-600">{item.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Bar Chart - Missing Conditions */}
          <Card className="border-[#4a9a8e]/20 bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="h-5 w-5 text-[#4a9a8e]" />
                Missing Conditions Frequency
              </CardTitle>
              <CardDescription>Which structural barriers appear most often in green lies</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                    <XAxis type="number" domain={[0, "auto"]} />
                    <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value: number, name: string, props: any) => [
                        `${value} statements`,
                        props.payload.fullName,
                      ]}
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                      }}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {barChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8 border-[#4a9a8e]/20 bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-[#4a9a8e]" />
              Honesty by Source Type
            </CardTitle>
            <CardDescription>Comparing structurally honest vs dishonest statements by source</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sourceBarData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="Dishonest" fill={COLORS.red} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Honest" fill={COLORS.green} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Most Common Missing Conditions - Text version */}
        <Card className="mb-8 border-[#4a9a8e]/20 bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[#4a9a8e]" />
              Detailed Condition Analysis
            </CardTitle>
            <CardDescription>
              These structural barriers appear most frequently in analyzed sustainability statements.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(Object.entries(dynamicStats.conditionFrequency) as [CriterionKey, number][])
                .sort(([, a], [, b]) => b - a)
                .map(([criterion, count]) => (
                  <div key={criterion}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700">{CRITERIA_LABELS[criterion]}</span>
                      <span className="text-gray-500">
                        {count} of {dynamicStats.totalStatements} statements
                      </span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${maxConditionCount > 0 ? (count / maxConditionCount) * 100 : 0}%`,
                          backgroundColor: count >= 4 ? COLORS.red : count >= 2 ? COLORS.orange : COLORS.sage,
                        }}
                      />
                    </div>
                  </div>
                ))}
            </div>

            <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-100">
              <p className="text-sm text-amber-800">
                <strong>Key Finding:</strong> Enforcement Power and Infrastructure Availability are the most commonly
                missing conditions. This reveals that most green messaging targets individuals who have no power to
                create systemic change.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8 border-[#4a9a8e]/20 bg-white">
          <CardHeader>
            <CardTitle>All Analyzed Statements</CardTitle>
            <CardDescription>Quick reference of statements and their verdicts from the database.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {allStatementsForDisplay.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No statements analyzed yet. Start by analyzing a statement!
                </p>
              ) : (
                allStatementsForDisplay.map((stmt, index) => {
                  const style = getVerdictStyle(stmt.verdict)
                  return (
                    <Link
                      key={`${stmt.id}-${stmt.linkPath}-${index}`}
                      href={stmt.linkPath}
                      className={`block p-4 rounded-lg border transition-all hover:shadow-md ${style.cardClass}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">&quot;{stmt.statement}&quot;</p>
                          <div className="flex gap-2 mt-2 text-xs flex-wrap">
                            <span className="px-2 py-0.5 bg-white/60 rounded">Target: {stmt.targetGroup}</span>
                            <span className="px-2 py-0.5 bg-white/60 rounded">Source: {stmt.sourceType}</span>
                            {stmt.isCustom && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">Custom Analysis</span>
                            )}
                          </div>
                        </div>
                        <span className={`text-xs font-semibold px-3 py-1 rounded-full shrink-0 ${style.badgeClass}`}>
                          {stmt.verdict}
                        </span>
                      </div>
                    </Link>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Call to Action */}
        <div className="text-center">
          <Link href="/analyze">
            <Button className="bg-gradient-to-r from-[#4a9a8e] to-[#6ab5a8] text-white px-8 py-6 text-lg">
              Analyze More Statements
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

export default function InsightsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#f5f3ef] flex items-center justify-center">
          <Card className="max-w-md">
            <CardContent className="pt-6 text-center">
              <p className="text-gray-600">Loading insights...</p>
            </CardContent>
          </Card>
        </main>
      }
    >
      <InsightsContent />
    </Suspense>
  )
}
