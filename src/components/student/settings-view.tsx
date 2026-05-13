'use client'

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Sun, Moon, Monitor, Volume2, Bell, BarChart2, Shield, Timer,
  UserCircle, ChevronRight, Globe, PlayCircle, Info,
  Download, RefreshCw, Smartphone, BellRing, Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const APP_VERSION = '2.6.0'
const BUILD_DATE = '2026-01-28'

function getLS(key: string, fallback: boolean): boolean {
  if (typeof window === 'undefined') return fallback
  const v = localStorage.getItem(key)
  return v === null ? fallback : v === 'true'
}
function setLS(key: string, value: boolean) {
  localStorage.setItem(key, String(value))
}

// Minimal toggle switch — no shadcn Switch needed
function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean
  onChange: () => void
  disabled?: boolean
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 disabled:cursor-not-allowed',
        checked ? 'bg-primary' : 'bg-muted-foreground/30'
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-md ring-0 transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0.5'
        )}
      />
    </button>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground px-1">
        {label}
      </p>
      {children}
    </div>
  )
}

function ToggleRow({
  icon: Icon,
  title,
  description,
  checked,
  onToggle,
  disabled,
}: {
  icon: React.ElementType
  title: string
  description?: string
  checked: boolean
  onToggle: () => void
  disabled?: boolean
}) {
  return (
    <div className={cn('flex items-center gap-3 py-3 px-3', disabled && 'opacity-50')}>
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{title}</p>
        {description && <p className="text-xs text-muted-foreground leading-snug">{description}</p>}
      </div>
      <Toggle checked={checked} onChange={onToggle} disabled={disabled} />
    </div>
  )
}

function ChevronRow({
  icon: Icon,
  title,
  description,
  onClick,
  expanded,
}: {
  icon: React.ElementType
  title: string
  description?: string
  onClick: () => void
  expanded?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 py-3 px-3 hover:bg-accent rounded-lg transition-colors text-left"
    >
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{title}</p>
        {description && <p className="text-xs text-muted-foreground leading-snug">{description}</p>}
      </div>
      <ChevronRight
        className={cn(
          'w-4 h-4 text-muted-foreground transition-transform shrink-0',
          expanded && 'rotate-90'
        )}
      />
    </button>
  )
}

function InlinePanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-3 mb-1 rounded-lg bg-muted/40 border border-border/50 divide-y divide-border/50">
      {children}
    </div>
  )
}

export function SettingsView() {
  const { theme, setTheme } = useTheme()
  const router = useRouter()

  const [notifSounds, setNotifSounds] = useState(false)
  const [soundEffects, setSoundEffects] = useState(false)

  const [notifExpanded, setNotifExpanded] = useState(false)
  const [browserNotifs, setBrowserNotifs] = useState(false)
  const [streakReminders, setStreakReminders] = useState(false)
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default')

  const [privacyExpanded, setPrivacyExpanded] = useState(false)
  const [leaderboardVisible, setLeaderboardVisible] = useState(true)

  const [haptic, setHaptic] = useState(false)
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    setNotifSounds(getLS('bims_notification_sounds', false))
    setSoundEffects(getLS('bims_sound_effects', false))
    setStreakReminders(getLS('bims_streak_reminders', false))
    setLeaderboardVisible(getLS('bims_leaderboard_visible', true))
    setHaptic(getLS('bims_haptic_feedback', false))

    if ('Notification' in window) {
      setNotifPermission(Notification.permission)
      setBrowserNotifs(
        Notification.permission === 'granted' && getLS('bims_browser_notifs', false)
      )
    }

    function handleBeforeInstall(e: Event) {
      e.preventDefault()
      setInstallPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
  }, [])

  function vibrate() {
    if (haptic) navigator.vibrate?.(10)
  }

  function simpleToggle(
    current: boolean,
    setter: (v: boolean) => void,
    key: string
  ) {
    const next = !current
    setter(next)
    setLS(key, next)
    vibrate()
  }

  async function handleBrowserNotifs() {
    if (browserNotifs) {
      setBrowserNotifs(false)
      setLS('bims_browser_notifs', false)
      return
    }
    if (!('Notification' in window)) {
      toast.error('Notifications not supported in this browser')
      return
    }
    if (Notification.permission === 'denied') {
      toast.error('Notifications blocked — enable them in your browser settings')
      return
    }
    const permission = await Notification.requestPermission()
    setNotifPermission(permission)
    if (permission !== 'granted') {
      toast.error('Permission not granted')
      return
    }
    setBrowserNotifs(true)
    setLS('bims_browser_notifs', true)
    toast.success('Browser notifications enabled')
  }

  async function handleInstall() {
    if (!installPrompt) return
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') {
      setInstallPrompt(null)
      setIsInstalled(true)
      toast.success('App installed!')
    }
  }

  function handleForceRefresh() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => {
        regs.forEach(r => r.update())
      })
    }
    window.location.reload()
  }

  function handleTour() {
    localStorage.removeItem('bims_student_tutorial_v1')
    window.dispatchEvent(new CustomEvent('bims:launch-tutorial'))
    toast.success('Tutorial launched!')
  }

  const themes = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ] as const

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Settings className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground text-sm">Manage your account and preferences</p>
        </div>
      </div>

      {/* APPEARANCE */}
      <Section label="Appearance">
        <Card>
          <CardContent className="pt-4 pb-4 px-3">
            <div className="flex items-center gap-2 mb-3">
              <Monitor className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Theme</span>
            </div>
            <div className="flex gap-2">
              {themes.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  className={cn(
                    'flex-1 flex flex-col items-center gap-1.5 py-3 rounded-lg border text-sm font-medium transition-all',
                    theme === value
                      ? 'border-primary bg-primary/10 text-primary shadow-sm shadow-primary/20'
                      : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* AUDIO */}
      <Section label="Audio">
        <Card>
          <CardContent className="pt-1 pb-1 px-0 divide-y divide-border">
            <ToggleRow
              icon={Bell}
              title="Notification Sounds"
              description="Audio for messages and alerts"
              checked={notifSounds}
              onToggle={() => simpleToggle(notifSounds, setNotifSounds, 'bims_notification_sounds')}
            />
            <ToggleRow
              icon={Volume2}
              title="Sound Effects"
              description="Play sounds for quiz results"
              checked={soundEffects}
              onToggle={() => simpleToggle(soundEffects, setSoundEffects, 'bims_sound_effects')}
            />
          </CardContent>
        </Card>
      </Section>

      {/* PREFERENCES */}
      <Section label="Preferences">
        <Card>
          <CardContent className="pt-1 pb-1 px-0 divide-y divide-border">
            <ChevronRow
              icon={UserCircle}
              title="Profile"
              description="Name, avatar, display preferences"
              onClick={() => router.push('/student/profile')}
            />

            <ChevronRow
              icon={BellRing}
              title="Notifications"
              description="Sounds, browser alerts, reminders"
              onClick={() => setNotifExpanded(v => !v)}
              expanded={notifExpanded}
            />
            {notifExpanded && (
              <InlinePanel>
                <ToggleRow
                  icon={Bell}
                  title="Browser Notifications"
                  description={
                    notifPermission === 'denied'
                      ? 'Blocked — enable in your browser settings'
                      : 'Allow browser push alerts'
                  }
                  checked={browserNotifs}
                  onToggle={handleBrowserNotifs}
                  disabled={notifPermission === 'denied'}
                />
                <ToggleRow
                  icon={BellRing}
                  title="Streak Reminders"
                  description="Remind you before losing your streak"
                  checked={streakReminders}
                  onToggle={() =>
                    simpleToggle(streakReminders, setStreakReminders, 'bims_streak_reminders')
                  }
                />
              </InlinePanel>
            )}

            <ChevronRow
              icon={BarChart2}
              title="Study Analytics"
              description="Learning patterns and insights"
              onClick={() => router.push('/student/progress')}
            />

            <ChevronRow
              icon={Shield}
              title="Privacy & Leaderboard"
              description="Control your visibility on rankings"
              onClick={() => setPrivacyExpanded(v => !v)}
              expanded={privacyExpanded}
            />
            {privacyExpanded && (
              <InlinePanel>
                <ToggleRow
                  icon={Shield}
                  title="Visible on leaderboard"
                  description="Other students can see your name and weekly stats"
                  checked={leaderboardVisible}
                  onToggle={() =>
                    simpleToggle(leaderboardVisible, setLeaderboardVisible, 'bims_leaderboard_visible')
                  }
                />
              </InlinePanel>
            )}

            <ChevronRow
              icon={Timer}
              title="Study Timer"
              description="Pomodoro and focus sessions"
              onClick={() => router.push('/student/study-timer')}
            />
          </CardContent>
        </Card>
      </Section>

      {/* APP SETTINGS */}
      <Section label="App Settings">
        <Card>
          <CardContent className="pt-1 pb-1 px-0 divide-y divide-border">
            {/* Install */}
            {!isInstalled && (
              <div className="flex items-center gap-3 py-3 px-3">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Download className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Install App</p>
                  <p className="text-xs text-muted-foreground">Add to home screen for quick access</p>
                </div>
                <Button
                  size="sm"
                  variant={installPrompt ? 'default' : 'outline'}
                  onClick={handleInstall}
                  disabled={!installPrompt}
                  className="shrink-0"
                >
                  {installPrompt ? 'Install' : 'Not available'}
                </Button>
              </div>
            )}
            {isInstalled && (
              <div className="flex items-center gap-3 py-3 px-3">
                <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                  <Download className="w-4 h-4 text-green-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Installed App</p>
                  <p className="text-xs text-muted-foreground">Running as installed PWA</p>
                </div>
              </div>
            )}

            <ToggleRow
              icon={Smartphone}
              title="Haptic Feedback"
              description="Vibrate on actions (mobile)"
              checked={haptic}
              onToggle={() => {
                const next = !haptic
                setHaptic(next)
                setLS('bims_haptic_feedback', next)
                if (next) navigator.vibrate?.(20)
              }}
            />

            <div className="flex items-center gap-3 py-3 px-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <PlayCircle className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Reset Tutorial</p>
                <p className="text-xs text-muted-foreground">View the onboarding guide again</p>
              </div>
              <Button size="sm" variant="outline" onClick={handleTour} className="shrink-0">
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* REGION */}
      <Section label="Region">
        <Card>
          <CardContent className="pt-1 pb-1 px-0">
            <div className="flex items-center gap-3 py-3 px-3 opacity-60">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Globe className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Language & Region</p>
                <p className="text-xs text-muted-foreground">English (UK) — coming soon</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* HELP */}
      <Section label="Help">
        <Card>
          <CardContent className="pt-1 pb-1 px-0">
            <button
              onClick={handleTour}
              className="w-full flex items-center gap-3 py-3 px-3 hover:bg-accent rounded-lg transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <PlayCircle className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Take a Tour</p>
                <p className="text-xs text-muted-foreground">Re-launch the guided dashboard walkthrough</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
          </CardContent>
        </Card>
      </Section>

      {/* ABOUT */}
      <Section label="About">
        <Card>
          <CardContent className="pt-1 pb-1 px-0 divide-y divide-border">
            <div className="py-3 px-3 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Info className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">BIMS Companion</p>
                  <p className="text-xs text-muted-foreground">
                    Version {APP_VERSION} · Built {BUILD_DATE}
                  </p>
                </div>
                {isInstalled && (
                  <span className="text-xs text-green-500 font-medium">Installed App</span>
                )}
              </div>
              <div className="flex gap-2 pl-11">
                <Button
                  size="sm"
                  onClick={handleForceRefresh}
                  className="gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Force Refresh
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleForceRefresh}
                  className="gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Check for Updates
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </Section>
    </div>
  )
}
