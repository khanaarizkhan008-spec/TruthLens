"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { AlertTriangle, ChevronDown, CheckCircle2, XCircle, HelpCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export type Verdict = "Likely True" | "Disputed" | "Unverifiable"

export interface ClaimData {
  claim: string
  verdict: Verdict
  explanation: string
  manipulation_flags: string[]
}

const verdictConfig = {
  "Likely True": {
    icon: <CheckCircle2 className="w-5 h-5 text-green-600" />,
    badgeVariant: "success" as const,
    bgClass: "bg-green-50/50",
    borderClass: "border-green-200"
  },
  "Disputed": {
    icon: <XCircle className="w-5 h-5 text-red-600" />,
    badgeVariant: "destructive" as const,
    bgClass: "bg-red-50/50",
    borderClass: "border-red-200"
  },
  "Unverifiable": {
    icon: <HelpCircle className="w-5 h-5 text-amber-600" />,
    badgeVariant: "warning" as const,
    bgClass: "bg-amber-50/50",
    borderClass: "border-amber-200"
  }
}

export function ClaimCard({ data, index }: { data: ClaimData, index: number }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const config = verdictConfig[data.verdict] || verdictConfig["Unverifiable"]

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: "easeOut" }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="w-full"
    >
      <Card className={cn("overflow-hidden transition-all duration-300", isExpanded && "shadow-md border-slate-300")}>
        <div className={cn("h-1 w-full transition-colors", config.bgClass, config.borderClass, "border-t")} />
        <CardContent className="p-6">
          <div 
            className="flex items-start justify-between gap-4 cursor-pointer"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                {config.icon}
                <Badge variant={config.badgeVariant}>{data.verdict}</Badge>
              </div>
              <h3 className="text-lg font-medium text-slate-900 leading-snug">
                "{data.claim}"
              </h3>
            </div>
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="mt-1 flex-shrink-0 text-slate-400 hover:text-slate-600 bg-slate-50 rounded-full p-1"
            >
              <ChevronDown className="w-5 h-5" />
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
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">AI Analysis</h4>
                    <p className="text-slate-700 leading-relaxed text-sm">
                      {data.explanation}
                    </p>
                  </div>
                  
                  {data.manipulation_flags && data.manipulation_flags.length > 0 && (
                    <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-100">
                      <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        Manipulation Flags
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {data.manipulation_flags.map((flag, idx) => (
                          <Badge key={idx} variant="outline" className="bg-white">
                            {flag}
                          </Badge>
                        ))}
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
