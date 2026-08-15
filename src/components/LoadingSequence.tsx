"use client"

import React, { useEffect, useRef, useState } from "react"
import gsap from "gsap"
import { Search, BrainCircuit, FileText, CheckCircle2 } from "lucide-react"

export function LoadingSequence() {
  const containerRef = useRef<HTMLDivElement>(null)
  const stepsRef = useRef<HTMLDivElement[]>([])
  
  const [currentStep, setCurrentStep] = useState(0)

  const steps = [
    { text: "Reading text content...", icon: <FileText className="w-5 h-5" /> },
    { text: "Extracting factual claims...", icon: <Search className="w-5 h-5" /> },
    { text: "Cross-referencing knowledge base...", icon: <BrainCircuit className="w-5 h-5" /> },
    { text: "Checking claim 1 of 3...", icon: <Search className="w-5 h-5" /> },
    { text: "Checking claim 2 of 3...", icon: <Search className="w-5 h-5" /> },
    { text: "Checking claim 3 of 3...", icon: <Search className="w-5 h-5" /> },
    { text: "Finalizing verdict...", icon: <CheckCircle2 className="w-5 h-5" /> },
  ]

  useEffect(() => {
    let timeline = gsap.timeline()
    
    steps.forEach((step, index) => {
      timeline.to(stepsRef.current[index], {
        opacity: 1,
        y: 0,
        duration: 0.4,
        ease: "power2.out",
        onStart: () => setCurrentStep(index)
      })
      timeline.to({}, { duration: index < 3 ? 0.8 : 1.2 })
      
      if (index < steps.length - 1) {
        timeline.to(stepsRef.current[index], {
          opacity: 0,
          y: -10,
          duration: 0.3,
          ease: "power2.in"
        }, "+=0")
      }
    })

    return () => {
      timeline.kill()
    }
  }, [])

  return (
    <div 
      ref={containerRef}
      className="flex flex-col items-center justify-center min-h-[300px] p-8 w-full relative overflow-hidden rounded-2xl bg-slate-50/50 border border-slate-100"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-white/0 via-teal-50/30 to-white/0 animate-pulse pointer-events-none" />
      
      <div className="relative h-16 w-full max-w-sm flex items-center justify-center">
        {steps.map((step, idx) => (
          <div
            key={idx}
            ref={(el) => {
              if (el) stepsRef.current[idx] = el
            }}
            className="absolute flex items-center gap-3 text-slate-700 font-medium text-lg opacity-0 translate-y-4"
          >
            <div className="text-teal-600 animate-pulse">
              {step.icon}
            </div>
            <span>{step.text}</span>
          </div>
        ))}
      </div>
      
      <div className="mt-8 w-64 h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div 
          className="h-full bg-teal-500 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.max(10, (currentStep / (steps.length - 1)) * 100)}%` }}
        />
      </div>
    </div>
  )
}
