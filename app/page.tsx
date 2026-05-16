import { Suspense } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Scale, Search, BarChart3, Users } from "lucide-react"

function LandingContent() {
  return (
    <main className="min-h-screen bg-[#f5f3ef]">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
          <div className="flex items-center gap-2 mb-8 px-4 py-2 rounded-full border border-[#4a9a8e]/30 bg-[#4a9a8e]/5">
            <Scale className="h-4 w-4 text-[#4a9a8e]" />
            <span className="text-sm font-medium text-[#4a9a8e]">Structural Accountability Analyzer</span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-2 text-balance">
            Are Green Promises
          </h1>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#4a9a8e] mb-8 text-balance">
            Actually Actionable?
          </h1>

          <p className="text-lg text-gray-600 mb-10 max-w-2xl text-pretty leading-relaxed">
            Not all sustainability messages are equal. Some assign responsibility without giving power. This tool
            exposes <span className="font-semibold text-gray-800">structural dishonesty</span> using transparent,
            auditable logic.
          </p>

          <Link href="/analyze">
            <Button size="lg" className="bg-[#4a9a8e] hover:bg-[#3d8275] text-white px-8 py-6 text-lg rounded-xl">
              <Search className="mr-2 h-5 w-5" />
              Analyze a Green Claim
            </Button>
          </Link>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-white py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-900 mb-12">How It Works</h2>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="flex flex-col items-center text-center p-6">
              <div className="p-4 bg-[#4a9a8e]/10 rounded-full mb-4">
                <Search className="h-8 w-8 text-[#4a9a8e]" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">1. Submit a Statement</h3>
              <p className="text-gray-600">Choose a sustainability claim to analyze and identify who it targets.</p>
            </div>

            <div className="flex flex-col items-center text-center p-6">
              <div className="p-4 bg-[#4a9a8e]/10 rounded-full mb-4">
                <BarChart3 className="h-8 w-8 text-[#4a9a8e]" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">2. Evaluate Conditions</h3>
              <p className="text-gray-600">
                Assess whether the target group has the power, access, and infrastructure to act.
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-6">
              <div className="p-4 bg-[#4a9a8e]/10 rounded-full mb-4">
                <Users className="h-8 w-8 text-[#4a9a8e]" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">3. Get the Verdict</h3>
              <p className="text-gray-600">
                See if the statement is structurally honest or a green lie that shifts blame unfairly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What We Evaluate */}
      <section className="py-16 bg-[#4a9a8e]/5">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-900 mb-12">What We Evaluate</h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4 max-w-5xl mx-auto">
            {[
              { title: "Decision Authority", desc: "Can the target group make this decision?" },
              { title: "Access to Alternatives", desc: "Are sustainable options available?" },
              { title: "Affordability", desc: "Can they afford to take action?" },
              { title: "Infrastructure", desc: "Does the needed infrastructure exist?" },
              { title: "Enforcement Power", desc: "Can they enforce systemic change?" },
            ].map((item) => (
              <div key={item.title} className="bg-white p-4 rounded-xl shadow-sm border border-[#4a9a8e]/10">
                <h3 className="font-semibold text-gray-900 mb-1 text-sm">{item.title}</h3>
                <p className="text-xs text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">Ready to Detect Green Lies?</h2>
          <p className="text-gray-600 mb-8">
            Responsibility without power creates false accountability. Let&apos;s find out the truth.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/analyze">
              <Button size="lg" className="bg-[#4a9a8e] hover:bg-[#3d8275] text-white">
                Start Analyzing
              </Button>
            </Link>
            <Link href="/insights">
              <Button
                size="lg"
                variant="outline"
                className="border-[#4a9a8e] text-[#4a9a8e] hover:bg-[#4a9a8e]/5 bg-transparent"
              >
                View Patterns
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-400 text-sm">
            Green Lie Detector — Structural Honesty Analyzer for Sustainability Claims
          </p>
          <p className="text-gray-500 text-xs mt-2">Built for youth leadership in sustainability discourse</p>
        </div>
      </footer>
    </main>
  )
}

export default function LandingPage() {
  return (
    <Suspense fallback={null}>
      <LandingContent />
    </Suspense>
  )
}
