'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type TutorialStep = {
  icon: LucideIcon
  iconBg: string
  iconColor: string
  title: string
  description: string
}

export function TutorialModal({
  steps,
  onClose,
}: {
  steps: TutorialStep[]
  onClose: () => void
}) {
  const [index, setIndex] = useState(0)

  const step = steps[index]
  const isFirst = index === 0
  const isLast = index === steps.length - 1
  const Icon = step.icon

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-8 flex flex-col gap-6">
        {/* Skip button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Skip tutorial"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Step counter */}
        <p className="text-xs text-muted-foreground font-medium">
          {index + 1} of {steps.length}
        </p>

        {/* Icon */}
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${step.iconBg}`}>
          <Icon className={`w-8 h-8 ${step.iconColor}`} />
        </div>

        {/* Content */}
        <div className="space-y-2 min-h-[80px]">
          <h2 className="text-xl font-bold leading-tight">{step.title}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
        </div>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5">
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`rounded-full transition-all ${
                i === index
                  ? 'w-5 h-2 bg-primary'
                  : 'w-2 h-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
              }`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-muted-foreground"
          >
            Skip
          </Button>
          <div className="flex gap-2">
            {!isFirst && (
              <Button variant="outline" size="sm" onClick={() => setIndex(i => i - 1)}>
                <ChevronLeft className="w-4 h-4" />
                Back
              </Button>
            )}
            {isLast ? (
              <Button size="sm" onClick={onClose}>
                Get started
              </Button>
            ) : (
              <Button size="sm" onClick={() => setIndex(i => i + 1)}>
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
