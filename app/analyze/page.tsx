"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, ArrowRight, Scale, PenLine, ListChecks } from "lucide-react"
import { getStatements } from "@/lib/evaluation-engine"
import { saveCustomStatement } from "@/lib/custom-statements"

export default function AnalyzePage() {
  const router = useRouter()
  const statements = getStatements()
  const [selectedStatement, setSelectedStatement] = useState<string>(statements[0]?.id || "")

  const [customStatement, setCustomStatement] = useState("")
  const [statementSource, setStatementSource] = useState("")
  const [targetGroup, setTargetGroup] = useState("")
  const [inputMode, setInputMode] = useState<"custom" | "predefined">("predefined")

  const handleContinue = () => {
    if (selectedStatement) {
      router.push(`/analyze/${selectedStatement}`)
    }
  }

  const handleCustomAnalysis = () => {
    if (customStatement.length >= 10 && statementSource && targetGroup) {
      const customId = saveCustomStatement({
        statement: customStatement,
        sourceType: statementSource,
        targetGroup: targetGroup,
      })
      router.push(`/analyze/custom/${customId}`)
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
      <section className="container mx-auto px-4 py-8 max-w-3xl">
        <Link href="/" className="inline-flex items-center text-[#4a9a8e] hover:text-[#3d8275] mb-6">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Home
        </Link>

        <Card className="border-[#4a9a8e]/20 bg-white">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl md:text-3xl font-bold text-gray-900">Analyze a Green Statement</CardTitle>
            <CardDescription className="text-gray-500 mt-2">
              Enter any sustainability claim, policy statement, or environmental message you want to analyze.
            </CardDescription>

            <div className="mt-6 flex justify-center">
              <Select value={inputMode} onValueChange={(value: "custom" | "predefined") => setInputMode(value)}>
                <SelectTrigger className="w-[320px] border-[#4a9a8e]/30 focus:border-[#4a9a8e] focus:ring-[#4a9a8e] bg-[#4a9a8e]/5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="predefined">
                    <div className="flex items-center gap-2">
                      <ListChecks className="h-4 w-4 text-[#4a9a8e]" />
                      <span>Patterns in Green Messaging</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="custom">
                    <div className="flex items-center gap-2">
                      <PenLine className="h-4 w-4 text-[#4a9a8e]" />
                      <span>Paste the Green Statement</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {inputMode === "predefined" ? (
              <>
                <RadioGroup value={selectedStatement} onValueChange={setSelectedStatement} className="space-y-4">
                  {statements.map((stmt) => (
                    <div key={stmt.id} className="flex items-start space-x-3">
                      <RadioGroupItem value={stmt.id} id={stmt.id} className="mt-1 border-[#4a9a8e] text-[#4a9a8e]" />
                      <Label
                        htmlFor={stmt.id}
                        className={`flex-1 cursor-pointer p-4 rounded-lg border transition-colors ${
                          selectedStatement === stmt.id
                            ? "border-[#4a9a8e] bg-[#4a9a8e]/10"
                            : "border-gray-200 hover:border-[#4a9a8e]/50 hover:bg-[#4a9a8e]/5"
                        }`}
                      >
                        <p className="font-medium text-gray-900 mb-1">&quot;{stmt.statement}&quot;</p>
                        <div className="flex gap-2 text-xs">
                          <span className="px-2 py-0.5 bg-[#4a9a8e]/10 text-[#4a9a8e] rounded">
                            Target: {stmt.target_group}
                          </span>
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                            Source: {stmt.source_type}
                          </span>
                        </div>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>

                <div className="flex justify-end">
                  <Button
                    onClick={handleContinue}
                    disabled={!selectedStatement}
                    className="bg-gradient-to-r from-[#4a9a8e] to-[#7ab5ad] hover:from-[#3d8275] hover:to-[#6aa59d] text-white px-8 py-6 text-lg rounded-xl disabled:opacity-50"
                  >
                    Continue to Evaluation
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label htmlFor="statement" className="text-sm font-medium text-gray-800 mb-2 block">
                    Statement to Analyze
                  </Label>
                  <Textarea
                    id="statement"
                    placeholder="Example: Youth should avoid plastic to save the planet..."
                    value={customStatement}
                    onChange={(e) => setCustomStatement(e.target.value)}
                    className="min-h-[140px] resize-none border-gray-200 focus:border-[#4a9a8e] focus:ring-[#4a9a8e] text-gray-800 placeholder:text-gray-400"
                  />
                  <p className="text-sm mt-2 text-gray-500">
                    Minimum <span className="text-[#4a9a8e] font-medium">10</span> characters required
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-800 mb-2 block">Statement Source</Label>
                    <Select value={statementSource} onValueChange={setStatementSource}>
                      <SelectTrigger className="border-gray-200 focus:border-[#4a9a8e] focus:ring-[#4a9a8e]">
                        <SelectValue placeholder="Select source type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Corporate">Corporate</SelectItem>
                        <SelectItem value="Government">Government</SelectItem>
                        <SelectItem value="Campaign">Campaign</SelectItem>
                        <SelectItem value="Educational">Educational</SelectItem>
                        <SelectItem value="Media">Media</SelectItem>
                        <SelectItem value="NGO">NGO</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-800 mb-2 block">Target Group</Label>
                    <Select value={targetGroup} onValueChange={setTargetGroup}>
                      <SelectTrigger className="border-gray-200 focus:border-[#4a9a8e] focus:ring-[#4a9a8e]">
                        <SelectValue placeholder="Select target group" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Youth">Youth</SelectItem>
                        <SelectItem value="Consumers">Consumers</SelectItem>
                        <SelectItem value="General Public">General Public</SelectItem>
                        <SelectItem value="Students">Students</SelectItem>
                        <SelectItem value="Employees">Employees</SelectItem>
                        <SelectItem value="Citizens">Citizens</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  onClick={handleCustomAnalysis}
                  disabled={customStatement.length < 10 || !statementSource || !targetGroup}
                  className="w-full bg-gradient-to-r from-[#4a9a8e] to-[#7ab5ad] hover:from-[#3d8275] hover:to-[#6aa59d] text-white py-6 text-lg rounded-xl disabled:opacity-50"
                >
                  Analyze Statement
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
