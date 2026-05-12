'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown,
  Type, Heading2, ImageIcon, Video, Table2, List, MessageSquare,
  Minus, FileText, GripVertical, CheckCircle2, Link2, Unlink,
  Eye, EyeOff, Save, Loader2,
} from 'lucide-react'
import type { ContentBlock, YearGroup } from '@/types/database'
import type { LoadedLesson } from '@/app/teacher/curriculum/page'

type BlockWithId = ContentBlock & { _id: string }

function uid() { return Math.random().toString(36).slice(2) }

function defaultBlock(type: ContentBlock['type']): BlockWithId {
  const _id = uid()
  switch (type) {
    case 'text':    return { _id, type: 'text', content: '' }
    case 'heading': return { _id, type: 'heading', content: '', level: 2 }
    case 'image':   return { _id, type: 'image', url: '', caption: '' }
    case 'video':   return { _id, type: 'video', url: '', caption: '' }
    case 'table':   return { _id, type: 'table', headers: ['Column 1', 'Column 2'], rows: [['', '']] }
    case 'list':    return { _id, type: 'list', style: 'bullet', items: [''] }
    case 'callout': return { _id, type: 'callout', variant: 'info', content: '', title: '' }
    case 'divider': return { _id, type: 'divider' }
    case 'file':    return { _id, type: 'file', url: '', name: '' }
    default:        return { _id, type: 'text', content: '' }
  }
}

function blockPreview(block: BlockWithId): string {
  switch (block.type) {
    case 'text':    return (block.content || 'Empty paragraph').slice(0, 80)
    case 'heading': return `H${block.level}: ${block.content || 'Heading'}`
    case 'image':   return block.caption ? `Image: ${block.caption}` : 'Image'
    case 'video':   return block.caption ? `Video: ${block.caption}` : block.url ? `Video: ${block.url.slice(0, 50)}` : 'Video'
    case 'table':   return `Table: ${block.headers.length} cols × ${block.rows.length} rows`
    case 'list':    return `${block.style === 'bullet' ? '•' : '1.'} ${block.items[0] || 'List'}`
    case 'callout': return `[${block.variant}] ${(block.title || block.content || 'Callout').slice(0, 60)}`
    case 'divider': return '── Divider ──'
    case 'file':    return `File: ${block.name || 'attachment'}`
  }
}

const BLOCK_TYPES: { type: ContentBlock['type']; label: string; icon: React.ElementType }[] = [
  { type: 'text',    label: 'Text',    icon: Type },
  { type: 'heading', label: 'Heading', icon: Heading2 },
  { type: 'image',   label: 'Image',   icon: ImageIcon },
  { type: 'video',   label: 'Video',   icon: Video },
  { type: 'table',   label: 'Table',   icon: Table2 },
  { type: 'list',    label: 'List',    icon: List },
  { type: 'callout', label: 'Callout', icon: MessageSquare },
  { type: 'divider', label: 'Divider', icon: Minus },
  { type: 'file',    label: 'File',    icon: FileText },
]

const CALLOUT_VARIANTS = ['tip', 'info', 'warning', 'key-term'] as const
const CALLOUT_STYLES: Record<string, string> = {
  'tip':      'bg-green-500/10 border-green-500/30 text-green-700',
  'info':     'bg-blue-500/10 border-blue-500/30 text-blue-700',
  'warning':  'bg-yellow-500/10 border-yellow-500/30 text-yellow-700',
  'key-term': 'bg-purple-500/10 border-purple-500/30 text-purple-700',
}

type LinkedQuestion = { id: string; question: string; difficulty: string }
type LinkedFlashcard = { id: string; term: string; definition: string }

export function LessonEditor({
  lesson, topicId, subjectId, teacherId, onSave, onCancel,
}: {
  lesson: LoadedLesson | null
  topicId: string
  subjectId: string
  teacherId: string
  onSave: (saved: LoadedLesson) => void
  onCancel: () => void
}) {
  const supabase = createClient()

  const [title, setTitle] = useState(lesson?.title ?? '')
  const [outcomes, setOutcomes] = useState<string[]>(lesson?.learning_outcomes ?? [''])
  const [blocks, setBlocks] = useState<BlockWithId[]>(
    (lesson?.content ?? []).map(b => ({ ...b, _id: uid() }))
  )
  const [isPublished, setIsPublished] = useState(lesson?.is_published ?? false)
  const [expandedBlock, setExpandedBlock] = useState<string | null>(null)
  const [showBlockPicker, setShowBlockPicker] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null) // block _id

  // Resources tab
  const [resourcesLoaded, setResourcesLoaded] = useState(false)
  const [loadingResources, setLoadingResources] = useState(false)
  const [allQuestions, setAllQuestions] = useState<LinkedQuestion[]>([])
  const [allFlashcards, setAllFlashcards] = useState<LinkedFlashcard[]>([])
  const [linkedQuestionIds, setLinkedQuestionIds] = useState<Set<string>>(new Set())
  const [linkedFlashcardIds, setLinkedFlashcardIds] = useState<Set<string>>(new Set())

  async function loadResources() {
    if (resourcesLoaded) return
    setLoadingResources(true)
    const [qRes, fRes] = await Promise.all([
      (supabase as any).from('quiz_questions')
        .select('id, question, difficulty, lesson_id')
        .eq('subject_id', subjectId),
      (supabase as any).from('flashcards')
        .select('id, term, definition, lesson_id')
        .eq('subject_id', subjectId),
    ])
    setAllQuestions((qRes.data ?? []) as LinkedQuestion[])
    setAllFlashcards((fRes.data ?? []) as LinkedFlashcard[])
    if (lesson?.id) {
      setLinkedQuestionIds(new Set(
        (qRes.data ?? []).filter((q: any) => q.lesson_id === lesson.id).map((q: any) => q.id)
      ))
      setLinkedFlashcardIds(new Set(
        (fRes.data ?? []).filter((f: any) => f.lesson_id === lesson.id).map((f: any) => f.id)
      ))
    }
    setResourcesLoaded(true)
    setLoadingResources(false)
  }

  // ── Block helpers ──────────────────────────────────────────────────────────
  function updateBlock(id: string, patch: Partial<ContentBlock>) {
    setBlocks(prev => prev.map(b => b._id === id ? { ...b, ...patch } as BlockWithId : b))
  }

  function deleteBlock(id: string) {
    setBlocks(prev => prev.filter(b => b._id !== id))
    if (expandedBlock === id) setExpandedBlock(null)
  }

  function moveBlock(id: string, dir: -1 | 1) {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b._id === id)
      if (idx < 0) return prev
      const next = [...prev]
      const target = idx + dir
      if (target < 0 || target >= next.length) return prev
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return next
    })
  }

  function addBlock(type: ContentBlock['type']) {
    const block = defaultBlock(type)
    setBlocks(prev => [...prev, block])
    setExpandedBlock(block._id)
    setShowBlockPicker(false)
  }

  // ── Image / file upload ────────────────────────────────────────────────────
  async function uploadMedia(blockId: string, file: File) {
    setUploading(blockId)
    const ext = file.name.split('.').pop() ?? 'bin'
    const path = `${Date.now()}-${uid()}.${ext}`
    const { data, error } = await supabase.storage.from('lesson-media').upload(path, file)
    if (error) { toast.error('Upload failed: ' + error.message); setUploading(null); return }
    const { data: { publicUrl } } = supabase.storage.from('lesson-media').getPublicUrl(data.path)
    const block = blocks.find(b => b._id === blockId)
    if (block?.type === 'image') updateBlock(blockId, { url: publicUrl } as any)
    if (block?.type === 'file')  updateBlock(blockId, { url: publicUrl, name: file.name } as any)
    setUploading(null)
  }

  // ── Save ───────────────────────────────────────────────────────────────────
  async function save() {
    if (!title.trim()) { toast.error('Lesson title required'); return }
    setSaving(true)

    const cleanOutcomes = outcomes.filter(o => o.trim())
    const cleanBlocks = blocks.map(({ _id, ...rest }) => rest)

    let savedLesson: any

    if (lesson?.id) {
      const { data, error } = await (supabase as any).from('curriculum_lessons').update({
        title: title.trim(),
        learning_outcomes: cleanOutcomes,
        content: cleanBlocks,
        is_published: isPublished,
      }).eq('id', lesson.id).select('*').single()
      if (error) { toast.error('Failed to save lesson'); setSaving(false); return }
      savedLesson = data
    } else {
      // Get position
      const { data: existing } = await (supabase as any)
        .from('curriculum_lessons').select('id').eq('topic_id', topicId)
      const position = (existing ?? []).length
      const { data, error } = await (supabase as any).from('curriculum_lessons').insert({
        topic_id: topicId,
        title: title.trim(),
        learning_outcomes: cleanOutcomes,
        content: cleanBlocks,
        is_published: isPublished,
        position,
      }).select('*').single()
      if (error) { toast.error('Failed to create lesson'); setSaving(false); return }
      savedLesson = data
    }

    // Save resource links if tab was opened
    if (resourcesLoaded) {
      const lessonId = savedLesson.id
      // Update questions
      const qUpdates: Promise<any>[] = []
      allQuestions.forEach(q => {
        const wasLinked = lesson?.id ? (q as any).lesson_id === lesson.id : false
        const isLinked = linkedQuestionIds.has(q.id)
        if (isLinked && !wasLinked) {
          qUpdates.push((supabase as any).from('quiz_questions').update({ lesson_id: lessonId }).eq('id', q.id))
        } else if (!isLinked && wasLinked) {
          qUpdates.push((supabase as any).from('quiz_questions').update({ lesson_id: null }).eq('id', q.id))
        }
      })
      // Update flashcards
      allFlashcards.forEach(f => {
        const wasLinked = lesson?.id ? (f as any).lesson_id === lesson.id : false
        const isLinked = linkedFlashcardIds.has(f.id)
        if (isLinked && !wasLinked) {
          qUpdates.push((supabase as any).from('flashcards').update({ lesson_id: lessonId }).eq('id', f.id))
        } else if (!isLinked && wasLinked) {
          qUpdates.push((supabase as any).from('flashcards').update({ lesson_id: null }).eq('id', f.id))
        }
      })
      await Promise.all(qUpdates)
    }

    onSave({
      ...savedLesson,
      learning_outcomes: cleanOutcomes,
      content: cleanBlocks,
    })
    setSaving(false)
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-0">
      {/* Top bar */}
      <div className="flex items-center gap-3 pb-4 border-b border-border mb-6">
        <button
          onClick={onCancel}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Curriculum
        </button>
        <div className="flex-1" />
        <button
          onClick={() => setIsPublished(p => !p)}
          className={cn(
            'flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-colors',
            isPublished
              ? 'bg-green-500/10 border-green-500/30 text-green-700 hover:bg-green-500/20'
              : 'border-border text-muted-foreground hover:bg-accent'
          )}
        >
          {isPublished ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          {isPublished ? 'Published' : 'Draft'}
        </button>
        <Button onClick={save} disabled={saving} size="sm">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          {saving ? 'Saving...' : 'Save Lesson'}
        </Button>
      </div>

      {/* Title */}
      <div className="space-y-1 mb-6">
        <Input
          placeholder="Lesson title e.g. The Market"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="text-xl font-semibold h-12 border-0 border-b border-border rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary text-xl"
        />
      </div>

      <Tabs defaultValue="content" onValueChange={v => { if (v === 'resources') loadResources() }}>
        <TabsList>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="resources">Linked Resources</TabsTrigger>
        </TabsList>

        {/* ── Content tab ─────────────────────────────────────────────── */}
        <TabsContent value="content" className="space-y-6 mt-6">

          {/* Learning outcomes */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">Learning Outcomes</h3>
              <span className="text-xs text-muted-foreground">Students will be able to…</span>
            </div>
            <div className="space-y-2">
              {outcomes.map((outcome, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-muted-foreground text-sm w-5 text-right shrink-0">{i + 1}.</span>
                  <Input
                    placeholder="e.g. Define a market and explain how it functions"
                    value={outcome}
                    onChange={e => {
                      const next = [...outcomes]
                      next[i] = e.target.value
                      setOutcomes(next)
                    }}
                    className="flex-1 h-8 text-sm"
                  />
                  <button
                    onClick={() => setOutcomes(outcomes.filter((_, j) => j !== i))}
                    className="p-1 text-muted-foreground hover:text-destructive"
                    disabled={outcomes.length === 1}
                  ><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
            <button
              onClick={() => setOutcomes([...outcomes, ''])}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <Plus className="w-3 h-3" /> Add outcome
            </button>
          </div>

          <div className="border-t border-border" />

          {/* Content blocks */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Lesson Content</h3>

            {blocks.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No content yet. Add a block below to start building this lesson.
              </p>
            )}

            {blocks.map((block, idx) => {
              const expanded = expandedBlock === block._id
              return (
                <div key={block._id} className="border border-border rounded-xl overflow-hidden">
                  {/* Block header */}
                  <div
                    className={cn(
                      'flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-accent/50 transition-colors',
                      expanded && 'border-b border-border bg-accent/30'
                    )}
                    onClick={() => setExpandedBlock(expanded ? null : block._id)}
                  >
                    <span className="text-xs text-muted-foreground uppercase tracking-wide w-14 shrink-0">
                      {block.type}
                    </span>
                    <span className="text-sm text-muted-foreground flex-1 truncate">
                      {blockPreview(block)}
                    </span>
                    <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => moveBlock(block._id, -1)}
                        disabled={idx === 0}
                        className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30"
                      ><ChevronUp className="w-3 h-3" /></button>
                      <button
                        onClick={() => moveBlock(block._id, 1)}
                        disabled={idx === blocks.length - 1}
                        className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30"
                      ><ChevronDown className="w-3 h-3" /></button>
                      <button
                        onClick={() => deleteBlock(block._id)}
                        className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      ><Trash2 className="w-3 h-3" /></button>
                    </div>
                  </div>

                  {/* Block editor */}
                  {expanded && (
                    <div className="p-4">
                      <BlockEditor
                        block={block}
                        onChange={patch => updateBlock(block._id, patch)}
                        onUpload={file => uploadMedia(block._id, file)}
                        uploading={uploading === block._id}
                      />
                    </div>
                  )}
                </div>
              )
            })}

            {/* Add block */}
            <div className="relative">
              <button
                onClick={() => setShowBlockPicker(p => !p)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground border border-dashed border-border rounded-xl px-4 py-3 w-full hover:bg-accent/30 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Block
              </button>
              {showBlockPicker && (
                <div className="absolute top-full left-0 mt-1 z-10 bg-popover border border-border rounded-xl shadow-lg p-2 grid grid-cols-3 gap-1 min-w-[280px]">
                  {BLOCK_TYPES.map(({ type, label, icon: Icon }) => (
                    <button
                      key={type}
                      onClick={() => addBlock(type)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-accent transition-colors text-left"
                    >
                      <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── Resources tab ────────────────────────────────────────────── */}
        <TabsContent value="resources" className="space-y-6 mt-6">
          {loadingResources && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading resources…
            </div>
          )}

          {resourcesLoaded && (
            <>
              <p className="text-sm text-muted-foreground">
                Link quiz questions and flashcards to this lesson. Students will see practice suggestions at the end of the lesson, and the review page will surface this lesson when they get linked questions wrong.
              </p>

              {/* Quiz questions */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">
                  Quiz Questions
                  <Badge variant="secondary" className="ml-2">{linkedQuestionIds.size} linked</Badge>
                </h3>
                {allQuestions.length === 0 && (
                  <p className="text-xs text-muted-foreground">No questions for this subject yet. Add them in Content Manager.</p>
                )}
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {allQuestions.map(q => {
                    const linked = linkedQuestionIds.has(q.id)
                    return (
                      <div key={q.id} className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg border text-sm transition-colors',
                        linked ? 'border-primary/40 bg-primary/5' : 'border-border'
                      )}>
                        <span className="flex-1 truncate">{q.question}</span>
                        <Badge variant="outline" className={cn(
                          'text-xs shrink-0 capitalize',
                          q.difficulty === 'easy' ? 'text-green-600' : q.difficulty === 'hard' ? 'text-red-600' : 'text-yellow-600'
                        )}>{q.difficulty}</Badge>
                        <button
                          onClick={() => setLinkedQuestionIds(prev => {
                            const next = new Set(prev)
                            linked ? next.delete(q.id) : next.add(q.id)
                            return next
                          })}
                          className={cn(
                            'p-1 rounded transition-colors shrink-0',
                            linked
                              ? 'text-primary hover:text-destructive'
                              : 'text-muted-foreground hover:text-primary'
                          )}
                          title={linked ? 'Unlink' : 'Link to lesson'}
                        >
                          {linked ? <Unlink className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Flashcards */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">
                  Flashcards
                  <Badge variant="secondary" className="ml-2">{linkedFlashcardIds.size} linked</Badge>
                </h3>
                {allFlashcards.length === 0 && (
                  <p className="text-xs text-muted-foreground">No flashcards for this subject yet. Add them in Content Manager.</p>
                )}
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {allFlashcards.map(f => {
                    const linked = linkedFlashcardIds.has(f.id)
                    return (
                      <div key={f.id} className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg border text-sm transition-colors',
                        linked ? 'border-primary/40 bg-primary/5' : 'border-border'
                      )}>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{f.term}</p>
                          <p className="text-xs text-muted-foreground truncate">{f.definition}</p>
                        </div>
                        <button
                          onClick={() => setLinkedFlashcardIds(prev => {
                            const next = new Set(prev)
                            linked ? next.delete(f.id) : next.add(f.id)
                            return next
                          })}
                          className={cn(
                            'p-1 rounded transition-colors shrink-0',
                            linked
                              ? 'text-primary hover:text-destructive'
                              : 'text-muted-foreground hover:text-primary'
                          )}
                          title={linked ? 'Unlink' : 'Link to lesson'}
                        >
                          {linked ? <Unlink className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ─── Per-block editor ────────────────────────────────────────────────────────

function BlockEditor({
  block, onChange, onUpload, uploading,
}: {
  block: BlockWithId
  onChange: (patch: Partial<ContentBlock>) => void
  onUpload: (file: File) => void
  uploading: boolean
}) {
  const fileRef = useRef<HTMLInputElement>(null)

  switch (block.type) {
    case 'text':
      return (
        <Textarea
          placeholder="Write your paragraph content here…"
          value={block.content}
          onChange={e => onChange({ content: e.target.value } as any)}
          rows={5}
          className="text-sm"
        />
      )

    case 'heading':
      return (
        <div className="space-y-3">
          <div className="flex gap-2">
            {([2, 3] as const).map(level => (
              <button
                key={level}
                onClick={() => onChange({ level } as any)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors',
                  block.level === level
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:bg-accent'
                )}
              >H{level}</button>
            ))}
          </div>
          <Input
            placeholder="Heading text"
            value={block.content}
            onChange={e => onChange({ content: e.target.value } as any)}
            className={block.level === 2 ? 'text-xl font-bold' : 'text-lg font-semibold'}
          />
        </div>
      )

    case 'image':
      return (
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ImageIcon className="w-4 h-4 mr-2" />}
              {uploading ? 'Uploading…' : 'Upload Image'}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f) }}
            />
          </div>
          {block.url && (
            <img src={block.url} alt={block.caption ?? ''} className="rounded-lg max-h-48 object-contain border border-border" />
          )}
          <Input
            placeholder="Caption (optional)"
            value={block.caption ?? ''}
            onChange={e => onChange({ caption: e.target.value } as any)}
            className="text-sm"
          />
          <Input
            placeholder="Or paste image URL"
            value={block.url}
            onChange={e => onChange({ url: e.target.value } as any)}
            className="text-sm"
          />
        </div>
      )

    case 'video':
      return (
        <div className="space-y-3">
          <Input
            placeholder="YouTube or Vimeo URL e.g. https://www.youtube.com/watch?v=..."
            value={block.url}
            onChange={e => onChange({ url: e.target.value } as any)}
            className="text-sm"
          />
          {block.url && (
            <VideoPreview url={block.url} />
          )}
          <Input
            placeholder="Caption (optional)"
            value={block.caption ?? ''}
            onChange={e => onChange({ caption: e.target.value } as any)}
            className="text-sm"
          />
        </div>
      )

    case 'table': {
      const { headers, rows } = block
      return (
        <div className="space-y-3 overflow-x-auto">
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => onChange({ headers: [...headers, `Column ${headers.length + 1}`], rows: rows.map(r => [...r, '']) } as any)}>
              <Plus className="w-3 h-3 mr-1" /> Column
            </Button>
            <Button size="sm" variant="outline" onClick={() => onChange({ rows: [...rows, headers.map(() => '')] } as any)}>
              <Plus className="w-3 h-3 mr-1" /> Row
            </Button>
            {headers.length > 1 && (
              <Button size="sm" variant="ghost" onClick={() => onChange({ headers: headers.slice(0, -1), rows: rows.map(r => r.slice(0, -1)) } as any)}>
                Remove Last Column
              </Button>
            )}
            {rows.length > 1 && (
              <Button size="sm" variant="ghost" onClick={() => onChange({ rows: rows.slice(0, -1) } as any)}>
                Remove Last Row
              </Button>
            )}
          </div>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                {headers.map((h, ci) => (
                  <th key={ci} className="border border-border p-1">
                    <Input
                      value={h}
                      onChange={e => {
                        const next = [...headers]; next[ci] = e.target.value
                        onChange({ headers: next } as any)
                      }}
                      className="h-7 text-xs font-semibold text-center"
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="border border-border p-1">
                      <Input
                        value={cell}
                        onChange={e => {
                          const next = rows.map(r => [...r])
                          next[ri][ci] = e.target.value
                          onChange({ rows: next } as any)
                        }}
                        className="h-7 text-xs"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }

    case 'list':
      return (
        <div className="space-y-3">
          <div className="flex gap-2">
            {(['bullet', 'numbered'] as const).map(s => (
              <button
                key={s}
                onClick={() => onChange({ style: s } as any)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors capitalize',
                  block.style === s
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:bg-accent'
                )}
              >{s}</button>
            ))}
          </div>
          <div className="space-y-2">
            {block.items.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm w-5 text-right shrink-0">
                  {block.style === 'bullet' ? '•' : `${i + 1}.`}
                </span>
                <Input
                  value={item}
                  onChange={e => {
                    const next = [...block.items]; next[i] = e.target.value
                    onChange({ items: next } as any)
                  }}
                  className="flex-1 h-8 text-sm"
                  placeholder={`Item ${i + 1}`}
                />
                <button
                  onClick={() => onChange({ items: block.items.filter((_, j) => j !== i) } as any)}
                  disabled={block.items.length === 1}
                  className="p-1 text-muted-foreground hover:text-destructive disabled:opacity-30"
                ><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
          <button
            onClick={() => onChange({ items: [...block.items, ''] } as any)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <Plus className="w-3 h-3" /> Add item
          </button>
        </div>
      )

    case 'callout':
      return (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {CALLOUT_VARIANTS.map(v => (
              <button
                key={v}
                onClick={() => onChange({ variant: v } as any)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors capitalize',
                  block.variant === v
                    ? CALLOUT_STYLES[v] + ' border-current'
                    : 'border-border text-muted-foreground hover:bg-accent'
                )}
              >{v}</button>
            ))}
          </div>
          <Input
            placeholder="Title (optional) e.g. Key Definition"
            value={block.title ?? ''}
            onChange={e => onChange({ title: e.target.value } as any)}
            className="text-sm"
          />
          <Textarea
            placeholder="Callout content…"
            value={block.content}
            onChange={e => onChange({ content: e.target.value } as any)}
            rows={3}
            className="text-sm"
          />
        </div>
      )

    case 'divider':
      return (
        <div className="flex items-center gap-3 py-2 text-sm text-muted-foreground">
          <div className="flex-1 border-t border-border" />
          <span>Section break</span>
          <div className="flex-1 border-t border-border" />
        </div>
      )

    case 'file':
      return (
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
              {uploading ? 'Uploading…' : 'Upload File'}
            </Button>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f) }}
            />
          </div>
          <Input
            placeholder="File name (shown to students)"
            value={block.name}
            onChange={e => onChange({ name: e.target.value } as any)}
            className="text-sm"
          />
          {block.url && (
            <p className="text-xs text-muted-foreground truncate">URL: {block.url}</p>
          )}
        </div>
      )

    default:
      return null
  }
}

function VideoPreview({ url }: { url: string }) {
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
  let embedUrl: string | null = null
  if (ytMatch) embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`
  else if (vimeoMatch) embedUrl = `https://player.vimeo.com/video/${vimeoMatch[1]}`
  if (!embedUrl) return <p className="text-xs text-muted-foreground">Paste a YouTube or Vimeo URL to preview.</p>
  return (
    <div className="aspect-video rounded-lg overflow-hidden border border-border">
      <iframe src={embedUrl} className="w-full h-full" allowFullScreen title="Video preview" />
    </div>
  )
}
