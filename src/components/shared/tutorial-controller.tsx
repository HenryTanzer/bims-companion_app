'use client'

import { useEffect, useState } from 'react'
import { TutorialModal, type TutorialStep } from './tutorial-modal'

const STORAGE_KEY = 'bims_tutorial_v1'

const STUDENT_STEPS: TutorialStep[] = [
  {
    title: 'Welcome to BIMS Companion',
    description: 'Your personalised A-Level study platform. Earn XP, build streaks, and climb the leaderboard. This quick tour will show you where everything lives.',
  },
  {
    targetSelector: 'nav-home',
    tooltipSide: 'right',
    title: 'Dashboard',
    description: 'Your home screen — see your current level, XP, streak, and weekly goal at a glance. Come here to get an overview of your progress.',
  },
  {
    targetSelector: 'nav-quiz',
    tooltipSide: 'right',
    title: 'Quiz',
    description: 'Test your knowledge with MCQs from your enrolled subjects. Earn +10 XP per correct answer and a +25 XP bonus for a perfect score.',
  },
  {
    targetSelector: 'nav-flashcards',
    tooltipSide: 'right',
    title: 'Flashcards',
    description: 'Review key terms with spaced repetition. Rate your confidence after each card — ones you find hard come back sooner so you master them faster.',
  },
  {
    targetSelector: 'nav-daily-challenge',
    tooltipSide: 'right',
    title: 'Daily Challenge',
    description: 'One new question every day. Earn +35 XP for a correct answer. You only get one attempt — come back each day to keep your streak alive.',
  },
  {
    targetSelector: 'nav-modules',
    tooltipSide: 'right',
    title: 'Modules',
    description: 'Assignments set by your teacher with a due date. Work through each question and submit before the deadline.',
  },
  {
    targetSelector: 'nav-study-buddy',
    tooltipSide: 'right',
    title: 'Study Buddy',
    description: 'Your AI tutor. Ask it to explain concepts, work through past paper questions, or clarify definitions. It stays strictly on your A-Level subject.',
  },
  {
    targetSelector: 'nav-review',
    tooltipSide: 'right',
    title: 'Review',
    description: 'Questions you\'ve answered incorrectly in quizzes appear here. Practice them in your own time — they drop off once you get them right.',
  },
  {
    targetSelector: 'nav-exam-center',
    tooltipSide: 'right',
    title: 'Exam Centre',
    description: 'Access past papers uploaded by your teacher. Open them in a new tab to read and practise exam-style questions.',
  },
  {
    targetSelector: 'nav-notifications',
    tooltipSide: 'right',
    title: 'Notifications',
    description: 'Announcements from your teachers appear here — important dates, reminders, and class updates.',
  },
  {
    title: 'You\'re ready!',
    description: 'Study every day to build your streak, complete the Daily Challenge, and climb the leaderboard. Good luck with your A-Levels!',
  },
]

const TEACHER_STEPS: TutorialStep[] = [
  {
    title: 'Welcome to the Teacher Portal',
    description: 'Manage your class, create content, and track student progress — all in one place. Here\'s where everything lives.',
  },
  {
    targetSelector: 'nav-content',
    tooltipSide: 'right',
    title: 'Content',
    description: 'Create quiz questions, flashcards, and topics. All content is subject-specific and available to enrolled students immediately.',
  },
  {
    targetSelector: 'nav-modules',
    tooltipSide: 'right',
    title: 'Modules',
    description: 'Build assignments from your quiz questions, set a due date, and publish to a subject. View a per-module gradebook to track every student\'s score.',
  },
  {
    targetSelector: 'nav-students',
    tooltipSide: 'right',
    title: 'Students',
    description: 'View all students with their XP, streak, and quiz history. Manage which subjects each student is enrolled in.',
  },
  {
    targetSelector: 'nav-exam-center',
    tooltipSide: 'right',
    title: 'Exam Centre',
    description: 'Upload past papers as PDFs for students to access. Use the AI \'Extract Qs\' button to pull MCQ questions directly from a PDF into your Content Library.',
  },
  {
    targetSelector: 'nav-messages',
    tooltipSide: 'right',
    title: 'Messages',
    description: 'Send announcements to a subject group or all students at once. Students see them in their Notifications tab immediately.',
  },
  {
    targetSelector: 'nav-analytics',
    tooltipSide: 'right',
    title: 'Analytics',
    description: 'Track quiz attempts, average scores, active students, and XP — broken down by subject. See top performers and a live feed of recent quiz activity.',
  },
  {
    title: 'You\'re all set!',
    description: 'Content you create is available to students instantly. Students earn XP for every activity, building streaks and competing on the leaderboard.',
  },
]

export function TutorialController({ portal }: { portal: 'student' | 'teacher' }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setShow(true)

    function handleLaunch() { setShow(true) }
    window.addEventListener('bims:launch-tutorial', handleLaunch)
    return () => window.removeEventListener('bims:launch-tutorial', handleLaunch)
  }, [])

  function handleClose() {
    localStorage.setItem(STORAGE_KEY, 'done')
    setShow(false)
  }

  if (!show) return null
  return <TutorialModal steps={portal === 'student' ? STUDENT_STEPS : TEACHER_STEPS} onClose={handleClose} />
}
