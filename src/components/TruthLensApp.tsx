"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ShieldCheck, AlertCircle, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ClaimCard, ClaimData } from "@/components/ClaimCard"
import { LoadingSequence } from "@/components/LoadingSequence"
import { Card, CardContent } from "@/components/ui/card"

type AppState = "idle" | "loading" | "success" | "error"

interface AnalysisResult {
  claims: ClaimData[]
  main_tip: string
}

const cache = new Map<string, AnalysisResult>()

export function TruthLensApp() {
  const [state, setState] = useState<AppState>("idle")
  const [text, setText] = useState("")
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [errorMsg, setErrorMsg] = useState("")

  const handleAnalyze = async () => {
    const trimmed = text.trim()
    if (!trimmed) return

    if (cache.has(trimmed)) {
      setResult(cache.get(trimmed)!)
      setState("success")
      return
    }

    setState("loading")
    setErrorMsg("")

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed })
      })

      if (!res.ok) {
        if (res.status === 429) {
          throw new Error("Too many checks right now — try again in a minute.")
        }
        throw new Error("Something went wrong during analysis.")
      }

      const data = await res.json()

      if (!data.claims || !Array.isArray(data.claims)) {
        throw new Error("Invalid response format from AI.")
      }

      cache.set(trimmed, data)
      setResult(data)
      setState("success")
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.")
      setState("error")
    }
  }

  const handleReset = () => {
    setText("")
    setState("idle")
    setResult(null)
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-12">
      <motion.div
        layout
        className="text-center space-y-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="inline-flex items-center justify-center p-3 bg-teal-50 rounded-2xl mb-2">
          <ShieldCheck className="w-8 h-8 text-teal-600" />
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
          TruthLens
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          AI-powered misinformation detection. Paste an article, claim, or news snippet below to fact-check the key points.
        </p>
      </motion.div>

      <AnimatePresence mode="wait">
        {(state === "idle" || state === "error") && (
          <motion.div
            key="input"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-3xl mx-auto space-y-6"
          >
            <Card className="border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6 space-y-4">
                <Textarea
                  placeholder="Paste text here to analyze..."
                  className="min-h-[160px] text-base resize-y bg-slate-50/50 border-slate-200 focus-visible:ring-teal-500"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
                <div className="flex justify-end">
                  <Button
                    size="lg"
                    onClick={handleAnalyze}
                    disabled={!text.trim()}
                    className="w-full sm:w-auto"
                  >
                    Analyze Content
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {state === "error" && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-red-50 text-red-800 rounded-xl flex items-start gap-3 border border-red-100"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
                <p>{errorMsg}</p>
              </motion.div>
            )}
          </motion.div>
        )}


        {state === "loading" && (
          <motion.div
            key="loading"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
            transition={{ duration: 0.4 }}
          >
            <LoadingSequence />
          </motion.div>
        )}
        <p className="text-center">Made with Love By Aariz and Team</p>

        {state === "success" && result && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">Analysis Results</h2>
              <Button variant="outline" size="sm" onClick={handleReset}>
                Check Another
              </Button>
            </div>

            {result.main_tip && (
              <div className="p-5 bg-teal-50 border border-teal-100 rounded-xl text-teal-900 flex items-start gap-4 shadow-sm">
                <ShieldCheck className="w-6 h-6 text-teal-600 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold mb-1 text-teal-950">Verdict Summary</h4>
                  <p className="text-teal-800 leading-relaxed text-sm md:text-base">{result.main_tip}</p>
                </div>
              </div>
            )}

            <div className="grid gap-6">
              {result.claims.map((claim, idx) => (
                <ClaimCard key={idx} data={claim} index={idx} />
              ))}
            </div>

            <p className="text-center text-sm text-slate-400 mt-8">
              Note: Verdicts reflect the AI's internal knowledge base augmented with best-effort web search (SerpAPI), not professional live fact-checking.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
