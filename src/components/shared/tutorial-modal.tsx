'use client'

import { useEffect, useLayoutEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

export type TutorialStep = {
  targetSelector?: string   // data-tutorial="x" — undefined = centered card
  tooltipSide?: 'right' | 'bottom' | 'left' | 'top'
  title: string
  description: string
}

const PAD = 10
const TOOLTIP_W = 300

type Cutout = { x: number; y: number; w: number; h: number }

function measure(selector: string | undefined): Cutout | null {
  if (!selector) return null
  const el = document.querySelector(`[data-tutorial="${selector}"]`)
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { x: r.x - PAD, y: r.y - PAD, w: r.width + PAD * 2, h: r.height + PAD * 2 }
}

function tooltipPosition(cutout: Cutout | null, side: TutorialStep['tooltipSide']): React.CSSProperties {
  // On mobile always anchor to the bottom — avoids overflow beside the narrow sidebar
  if (window.innerWidth < 768) {
    return { position: 'fixed', bottom: 16, left: 8, right: 8, zIndex: 50 }
  }

  if (!cutout) {
    return { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: TOOLTIP_W, zIndex: 50 }
  }
  const gap = 18
  const approxH = 230
  if (side === 'right' || !side) {
    return {
      position: 'fixed',
      left: cutout.x + cutout.w + gap,
      top: Math.max(8, Math.min(cutout.y + cutout.h / 2 - approxH / 2, window.innerHeight - approxH - 8)),
      width: TOOLTIP_W,
      zIndex: 50,
    }
  }
  if (side === 'bottom') {
    return {
      position: 'fixed',
      top: cutout.y + cutout.h + gap,
      left: Math.max(8, Math.min(cutout.x + cutout.w / 2 - TOOLTIP_W / 2, window.innerWidth - TOOLTIP_W - 8)),
      width: TOOLTIP_W,
      zIndex: 50,
    }
  }
  if (side === 'left') {
    return {
      position: 'fixed',
      left: Math.max(8, cutout.x - TOOLTIP_W - gap),
      top: Math.max(8, cutout.y + cutout.h / 2 - approxH / 2),
      width: TOOLTIP_W,
      zIndex: 50,
    }
  }
  // top
  return {
    position: 'fixed',
    top: Math.max(8, cutout.y - approxH - gap),
    left: Math.max(8, Math.min(cutout.x + cutout.w / 2 - TOOLTIP_W / 2, window.innerWidth - TOOLTIP_W - 8)),
    width: TOOLTIP_W,
    zIndex: 50,
  }
}

export function TutorialModal({ steps, onClose }: { steps: TutorialStep[]; onClose: () => void }) {
  const [index, setIndex] = useState(0)
  const [cutout, setCutout] = useState<Cutout | null>(null)

  const step = steps[index]
  const isFirst = index === 0
  const isLast = index === steps.length - 1

  const remeasure = useCallback(() => {
    setCutout(measure(step.targetSelector))
  }, [step.targetSelector])

  useLayoutEffect(() => {
    remeasure()
    window.addEventListener('resize', remeasure)
    return () => window.removeEventListener('resize', remeasure)
  }, [remeasure])

  // Scroll target into view when step changes
  useEffect(() => {
    if (step.targetSelector) {
      const el = document.querySelector(`[data-tutorial="${step.targetSelector}"]`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [step.targetSelector])

  const tipStyle = tooltipPosition(cutout, step.tooltipSide)

  function goNext() { isLast ? onClose() : setIndex(i => i + 1) }
  function goBack() { if (!isFirst) setIndex(i => i - 1) }

  return (
    <>
      {/* Full-screen click interceptor — prevents clicking through the overlay */}
      <div className="fixed inset-0" style={{ zIndex: 40 }} />

      {/* Dark overlay — box-shadow trick for targeted steps, solid for centered */}
      {cutout ? (
        <div
          className="fixed rounded-lg pointer-events-none"
          style={{
            left: cutout.x,
            top: cutout.y,
            width: cutout.w,
            height: cutout.h,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.65)',
            transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
            zIndex: 41,
          }}
        />
      ) : (
        <div className="fixed inset-0 bg-black/65" style={{ zIndex: 41 }} />
      )}

      {/* Highlight ring — animates in sync with the spotlight */}
      {cutout && (
        <div
          className="fixed rounded-lg pointer-events-none"
          style={{
            left: cutout.x,
            top: cutout.y,
            width: cutout.w,
            height: cutout.h,
            outline: '2px solid hsl(var(--primary))',
            boxShadow: '0 0 0 4px hsl(var(--primary) / 0.25)',
            transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
            zIndex: 42,
          }}
        />
      )}

      {/* Tooltip / centered card */}
      <div
        className="fixed bg-card border border-border rounded-xl shadow-2xl p-5 space-y-4"
        style={tipStyle}
      >
        {/* Top row */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-medium">{index + 1} / {steps.length}</span>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Close tutorial">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Text */}
        <div className="space-y-1.5">
          <h3 className="font-bold text-sm">{step.title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
        </div>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5">
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`rounded-full transition-all duration-200 ${i === index ? 'w-4 h-1.5 bg-primary' : 'w-1.5 h-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50'}`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-1">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs text-muted-foreground h-8 px-2">
            Skip
          </Button>
          <div className="flex gap-2">
            {!isFirst && (
              <Button variant="outline" size="sm" className="h-8" onClick={goBack}>
                <ChevronLeft className="w-3.5 h-3.5 mr-1" />Back
              </Button>
            )}
            <Button size="sm" className="h-8" onClick={goNext}>
              {isLast ? 'Done' : 'Next'}
              {!isLast && <ChevronRight className="w-3.5 h-3.5 ml-1" />}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
