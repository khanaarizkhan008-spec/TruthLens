"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { AlertTriangle, ChevronDown, CheckCircle2, XCircle, HelpCircle, ExternalLink, Info } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export type VerdictType = "SUPPORTED" | "CONTRADICTED" | "MISLEADING" | "INSUFFICIENT EVIDENCE"

export interface SourceData {
  source_name: string
  url: string
  credibility_score: number
  credibility_tier: number
  relationship: "SUPPORTS" | "CONTRADICTS" | "PROVIDES CONTEXT" | "DOES NOT DIRECTLY ADDRESS"
  summary: string
  published_year: string
}

export interface ClaimData {
  claim: string
  verdict: VerdictType
  confidence: number
  explanation: string
  manipulation_flags: string[]
  evidence_summary: {
    supporting: number
    contradicting: number
    contextual: number
  }
  sources: SourceData[]
}

const verdictConfig = {
  "SUPPORTED": {
    icon: <CheckCircle2 className="w-5 h-5 text-green-600" />,
    badgeVariant: "success" as const,
    bgClass: "bg-green-50/30",
    borderClass: "border-green-200/60",
    textClass: "text-green-800"
  },
  "CONTRADICTED": {
    icon: <XCircle className="w-5 h-5 text-red-600" />,
    badgeVariant: "destructive" as const,
    bgClass: "bg-red-50/30",
    borderClass: "border-red-200/60",
    textClass: "text-red-800"
  },
  "MISLEADING": {
    icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
    badgeVariant: "warning" as const,
    bgClass: "bg-amber-50/30",
    borderClass: "border-amber-200/60",
    textClass: "text-amber-800"
  },
  "INSUFFICIENT EVIDENCE": {
    icon: <HelpCircle className="w-5 h-5 text-slate-500" />,
    badgeVariant: "secondary" as const,
    bgClass: "bg-slate-50/50",
    borderClass: "border-slate-200/60",
    textClass: "text-slate-800"
  }
}

const relationshipConfig = {
  "SUPPORTS": { label: "Supports Claim", dot: "bg-green-500", text: "text-green-700 bg-green-50 border-green-200" },
  "CONTRADICTS": { label: "Contradicts Claim", dot: "bg-red-500", text: "text-red-700 bg-red-50 border-red-200" },
  "PROVIDES CONTEXT": { label: "Provides Context", dot: "bg-amber-500", text: "text-amber-700 bg-amber-50 border-amber-200" },
  "DOES NOT DIRECTLY ADDRESS": { label: "Doesn't Directly Address", dot: "bg-slate-400", text: "text-slate-600 bg-slate-100 border-slate-200" }
}

export function ClaimCard({ data, index }: { data: ClaimData, index: number }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const config = verdictConfig[data.verdict] || verdictConfig["INSUFFICIENT EVIDENCE"]

  // Stars calculation based on Tier: TIER 1 -> 5 stars, TIER 5 -> 1 star
  const getStars = (tier: number) => {
    const filled = Math.max(0, Math.min(5, 6 - tier))
    const empty = Math.max(0, Math.min(5, tier - 1))
    return {
      text: "★".repeat(filled) + "☆".repeat(empty),
      filled,
      empty
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: "easeOut" }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="w-full"
    >
      <Card className={cn("overflow-hidden transition-all duration-300 border border-slate-200/70", isExpanded && "shadow-md border-slate-300")}>
        <div className={cn("h-1 w-full transition-colors", config.bgClass, "border-b border-slate-100")} />
        <CardContent className="p-6">
          <div 
            className="flex items-start justify-between gap-4 cursor-pointer"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 font-semibold">
                  {config.icon}
                  <Badge variant={config.badgeVariant} className="font-bold tracking-wide uppercase px-2.5 py-0.5 text-xs">
                    {data.verdict}
                  </Badge>
                </div>
                {data.confidence !== undefined && (
                  <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    {data.confidence}% Confidence
                  </span>
                )}
              </div>
              <h3 className="text-lg font-semibold text-slate-900 leading-snug">
                "{data.claim}"
              </h3>
            </div>
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="mt-1 flex-shrink-0 text-slate-400 hover:text-slate-600 bg-slate-50 rounded-full p-1.5 transition-colors border border-slate-100"
            >
              <ChevronDown className="w-4 h-4" />
            </motion.div>
          </div>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="pt-6 mt-4 border-t border-slate-100 space-y-6">
                  {/* Explanation Section */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Analysis explanation</h4>
                    <p className="text-slate-700 leading-relaxed text-sm">
                      {data.explanation}
                    </p>
                  </div>

                  {/* Evidence Counts & Badges */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.evidence_summary && (
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2.5">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Info className="w-3.5 h-3.5" />
                          Evidence balance
                        </h4>
                        <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-600">
                          <span className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                            Supporting: {data.evidence_summary.supporting || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                            Contradicting: {data.evidence_summary.contradicting || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                            Contextual: {data.evidence_summary.contextual || 0}
                          </span>
                        </div>
                      </div>
                    )}

                    {data.manipulation_flags && data.manipulation_flags.length > 0 && (
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                          Manipulation Tactics
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {data.manipulation_flags.map((flag, idx) => (
                            <Badge key={idx} variant="outline" className="bg-white text-[11px] text-slate-700 border-slate-200 px-2 py-0">
                              {flag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Sources List */}
                  {data.sources && data.sources.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Evidence Used</h4>
                      <div className="grid gap-3">
                        {data.sources.map((source, sIdx) => {
                          const stars = getStars(source.credibility_tier)
                          const rel = relationshipConfig[source.relationship] || relationshipConfig["DOES NOT DIRECTLY ADDRESS"]
                          return (
                            <div 
                              key={sIdx}
                              className="p-4 rounded-xl border border-slate-200/60 bg-white/60 hover:bg-white hover:border-slate-300 transition-all duration-200"
                            >
                              <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="text-amber-500 font-serif text-sm tracking-tighter" title={`Tier ${source.credibility_tier}`}>
                                      {stars.text}
                                    </span>
                                    <h5 className="font-semibold text-slate-800 text-sm">
                                      {source.source_name}
                                    </h5>
                                  </div>
                                  <p className="text-[11px] text-slate-400">
                                    Source credibility estimate: <span className="font-medium text-slate-500">{source.credibility_score}/100</span>
                                    {source.published_year && source.published_year !== "N/A" && (
                                      <> &bull; Published: {source.published_year}</>
                                    )}
                                  </p>
                                </div>
                                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border tracking-wide uppercase", rel.text)}>
                                  {rel.label}
                                </span>
                              </div>
                              <p className="text-slate-600 text-xs leading-relaxed mb-3">
                                {source.summary}
                              </p>
                              {source.url && (
                                <a 
                                  href={source.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-600 hover:text-teal-700 hover:underline"
                                >
                                  Open Source
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  )
}
