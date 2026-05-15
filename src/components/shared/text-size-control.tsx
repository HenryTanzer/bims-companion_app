'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Type } from 'lucide-react'

const STORAGE_KEY = 'bims_text_scale'
const DEFAULT_SCALE = 100
const MIN_SCALE = 90
const MAX_SCALE = 125
const STEP = 5

function clampScale(value: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, value))
}

function readScale() {
  if (typeof window === 'undefined') return DEFAULT_SCALE
  const raw = window.localStorage.getItem(STORAGE_KEY)
  const parsed = raw ? Number(raw) : DEFAULT_SCALE
  return Number.isFinite(parsed) ? clampScale(parsed) : DEFAULT_SCALE
}

export function applyTextScale(scale: number) {
  if (typeof document === 'undefined') return
  const nextScale = clampScale(scale)
  document.documentElement.style.fontSize = `${nextScale}%`
  document.documentElement.dataset.textScale = String(nextScale)
}

export function TextSizeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    applyTextScale(readScale())
  }, [])

  return children
}

export function TextSizeControl({ compact = false }: { compact?: boolean }) {
  const [scale, setScale] = useState(DEFAULT_SCALE)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const saved = readScale()
    setScale(saved)
    applyTextScale(saved)
    setReady(true)
  }, [])

  function updateScale(nextScale: number) {
    const safeScale = clampScale(nextScale)
    setScale(safeScale)
    applyTextScale(safeScale)
    window.localStorage.setItem(STORAGE_KEY, String(safeScale))
  }

  function resetScale() {
    updateScale(DEFAULT_SCALE)
  }

  const displayScale = ready ? scale : DEFAULT_SCALE

  if (compact) {
    return (
      <div className="px-3 py-3">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <Type className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium">Text size</span>
          </div>
          <span className="text-xs tabular-nums text-muted-foreground">{displayScale}%</span>
        </div>
        <input
          type="range"
          min={MIN_SCALE}
          max={MAX_SCALE}
          step={STEP}
          value={displayScale}
          onChange={event => updateScale(Number(event.target.value))}
          className="w-full accent-primary"
          aria-label="Text size"
        />
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <Type className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium">Text and interface size</p>
            <p className="text-xs text-muted-foreground leading-snug">
              Increase text across the app for easier reading.
            </p>
          </div>
        </div>
        <span className="text-sm font-semibold tabular-nums shrink-0">{displayScale}%</span>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">A</span>
        <input
          type="range"
          min={MIN_SCALE}
          max={MAX_SCALE}
          step={STEP}
          value={displayScale}
          onChange={event => updateScale(Number(event.target.value))}
          className="flex-1 accent-primary"
          aria-label="Text and interface size"
        />
        <span className="text-base font-semibold text-muted-foreground">A</span>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          This stays on this device until changed.
        </p>
        <Button size="sm" variant="outline" onClick={resetScale} disabled={displayScale === DEFAULT_SCALE}>
          Reset
        </Button>
      </div>
    </div>
  )
}
