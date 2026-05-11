'use client'

import { useEffect, useState } from 'react'
import { TutorialModal, type TutorialStep } from './tutorial-modal'
import {
  Home, Brain, CreditCard, Zap, Layers, MessageSquare,
  BookOpen, Trophy, GraduationCap, PenSquare, Users, FileText,
  BarChart2, Bell,
} from 'lucide-react'

const STORAGE_KEY = 'bims_tutorial_v1'

const STUDENT_STEPS: TutorialStep[] = [
  {
    icon: GraduationCap,
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    title: 'Welcome to BIMS Companion',
    description: 'Your personalised A-Level study platform. Complete activities to earn XP, level up, and climb the leaderboard. Let\'s take a quick tour.',
  },
  {
    icon: Home,
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-500',
    title: 'Your Dashboard',
    description: 'See your level, XP, streak, and weekly goal at a glance. Your streak increases every day you study — try not to break the chain!',
  },
  {
    icon: Brain,
    iconBg: 'bg-purple-500/10',
    iconColor: 'text-purple-500',
    title: 'Quiz',
    description: 'Test your knowledge with multiple-choice questions from your enrolled subjects. Earn +10 XP per correct answer and a +25 XP bonus for a perfect score.',
  },
  {
    icon: CreditCard,
    iconBg: 'bg-pink-500/10',
    iconColor: 'text-pink-500',
    title: 'Flashcards',
    description: 'Review key terms using spaced repetition. Rate your confidence after each card — ones you find hard come back sooner.',
  },
  {
    icon: Zap,
    iconBg: 'bg-yellow-500/10',
    iconColor: 'text-yellow-500',
    title: 'Daily Challenge',
    description: 'One new question every day. Answer it correctly for +35 XP. You only get one attempt per day — make it count!',
  },
  {
    icon: Layers,
    iconBg: 'bg-orange-500/10',
    iconColor: 'text-orange-500',
    title: 'Modules',
    description: 'Assignments set by your teacher with a due date. Work through each question and submit before the deadline. XP is awarded for completion.',
  },
  {
    icon: MessageSquare,
    iconBg: 'bg-green-500/10',
    iconColor: 'text-green-500',
    title: 'Study Buddy',
    description: 'Your AI tutor — ask it to explain any concept, work through past paper questions, or clarify definitions. It only discusses your A-Level subject.',
  },
  {
    icon: BookOpen,
    iconBg: 'bg-cyan-500/10',
    iconColor: 'text-cyan-500',
    title: 'Review',
    description: 'Questions you\'ve answered incorrectly in quizzes appear here. Practice them until you get them right — they drop off your list once you\'ve mastered them.',
  },
  {
    icon: Bell,
    iconBg: 'bg-indigo-500/10',
    iconColor: 'text-indigo-500',
    title: 'Notifications',
    description: 'Announcements from your teachers appear here — important dates, new content, and reminders.',
  },
  {
    icon: Trophy,
    iconBg: 'bg-yellow-500/10',
    iconColor: 'text-yellow-500',
    title: 'You\'re ready!',
    description: 'Study every day to build your streak, complete the Daily Challenge, and keep climbing the leaderboard. Good luck with your A-Levels!',
  },
]

const TEACHER_STEPS: TutorialStep[] = [
  {
    icon: GraduationCap,
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    title: 'Welcome to the Teacher Portal',
    description: 'Manage your class, create content, and track student progress — all in one place. Here\'s a quick overview of what\'s available.',
  },
  {
    icon: PenSquare,
    iconBg: 'bg-purple-500/10',
    iconColor: 'text-purple-500',
    title: 'Content',
    description: 'Create quiz questions, flashcards, and topics. All content is subject-specific and immediately available to enrolled students in quizzes and flashcard sessions.',
  },
  {
    icon: Layers,
    iconBg: 'bg-orange-500/10',
    iconColor: 'text-orange-500',
    title: 'Modules',
    description: 'Build assignments from your quiz questions, set a due date, and publish to a subject. View a per-module gradebook to see every student\'s score.',
  },
  {
    icon: Users,
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-500',
    title: 'Students',
    description: 'View all students with their XP, streak, and quiz history. Manage which subjects each student is enrolled in — enrolments can be changed at any time.',
  },
  {
    icon: FileText,
    iconBg: 'bg-red-500/10',
    iconColor: 'text-red-500',
    title: 'Exam Centre',
    description: 'Upload past papers as PDFs. Students can open them anytime. Use the AI \'Extract Qs\' button to automatically pull MCQ questions from a paper into your Content Library.',
  },
  {
    icon: MessageSquare,
    iconBg: 'bg-green-500/10',
    iconColor: 'text-green-500',
    title: 'Messages',
    description: 'Send announcements to a subject group or all students at once. Students see your messages in their Notifications tab immediately.',
  },
  {
    icon: BarChart2,
    iconBg: 'bg-cyan-500/10',
    iconColor: 'text-cyan-500',
    title: 'Analytics',
    description: 'Track total quiz attempts, average scores, active students, and XP earned — broken down by subject. See top performers and a live feed of recent quiz activity.',
  },
  {
    icon: Trophy,
    iconBg: 'bg-yellow-500/10',
    iconColor: 'text-yellow-500',
    title: 'You\'re all set!',
    description: 'Content you create is available to students instantly. Students earn XP for every activity, building streaks and competing on the leaderboard. Welcome to BIMS Companion!',
  },
]

export function TutorialController({ portal }: { portal: 'student' | 'teacher' }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setShow(true)
    }

    function handleLaunch() {
      setShow(true)
    }

    window.addEventListener('bims:launch-tutorial', handleLaunch)
    return () => window.removeEventListener('bims:launch-tutorial', handleLaunch)
  }, [])

  function handleClose() {
    localStorage.setItem(STORAGE_KEY, 'done')
    setShow(false)
  }

  if (!show) return null

  const steps = portal === 'student' ? STUDENT_STEPS : TEACHER_STEPS
  return <TutorialModal steps={steps} onClose={handleClose} />
}
