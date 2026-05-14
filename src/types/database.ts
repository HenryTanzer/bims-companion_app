export type UserRole = 'student' | 'teacher' | 'admin'
export type SubjectName = 'IT' | 'Business' | 'Biology'
export type YearGroup = 'Year 12' | 'Year 13' | 'Both'

export type ContentBlock =
  | { type: 'text';    content: string }
  | { type: 'heading'; content: string; level: 2 | 3 }
  | { type: 'image';   url: string; caption?: string }
  | { type: 'video';   url: string; caption?: string }
  | { type: 'table';   headers: string[]; rows: string[][] }
  | { type: 'list';    style: 'bullet' | 'numbered'; items: string[] }
  | { type: 'callout'; variant: 'tip' | 'info' | 'warning' | 'key-term'; content: string; title?: string }
  | { type: 'divider' }
  | { type: 'file';    url: string; name: string }

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          role: UserRole
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      subjects: {
        Row: {
          id: string
          name: SubjectName
          description: string | null
          color: string
          icon: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['subjects']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['subjects']['Insert']>
      }
      topics: {
        Row: {
          id: string
          subject_id: string
          name: string
          description: string | null
          order_index: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['topics']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['topics']['Insert']>
      }
      enrollments: {
        Row: {
          id: string
          student_id: string
          subject_id: string
          enrolled_at: string
        }
        Insert: Omit<Database['public']['Tables']['enrollments']['Row'], 'id' | 'enrolled_at'>
        Update: Partial<Database['public']['Tables']['enrollments']['Insert']>
      }
      quiz_questions: {
        Row: {
          id: string
          topic_id: string | null
          subject_id: string
          question: string
          options: string[]
          correct_answer: number
          explanation: string | null
          difficulty: 'easy' | 'medium' | 'hard'
          created_by: string
          created_at: string
          lesson_id: string | null
        }
        Insert: Omit<Database['public']['Tables']['quiz_questions']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['quiz_questions']['Insert']>
      }
      quiz_attempts: {
        Row: {
          id: string
          student_id: string
          subject_id: string
          topic_id: string | null
          score: number
          total_questions: number
          answers: Record<string, number>
          xp_earned: number
          completed_at: string
        }
        Insert: Omit<Database['public']['Tables']['quiz_attempts']['Row'], 'id' | 'completed_at'>
        Update: Partial<Database['public']['Tables']['quiz_attempts']['Insert']>
      }
      flashcards: {
        Row: {
          id: string
          topic_id: string | null
          subject_id: string
          term: string
          definition: string
          created_by: string
          created_at: string
          lesson_id: string | null
        }
        Insert: Omit<Database['public']['Tables']['flashcards']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['flashcards']['Insert']>
      }
      flashcard_reviews: {
        Row: {
          id: string
          student_id: string
          flashcard_id: string
          confidence: 1 | 2 | 3 | 4 | 5
          next_review_at: string
          review_count: number
          last_reviewed_at: string
        }
        Insert: Omit<Database['public']['Tables']['flashcard_reviews']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['flashcard_reviews']['Insert']>
      }
      past_papers: {
        Row: {
          id: string
          subject_id: string
          title: string
          year: number
          paper_number: number | null
          file_url: string | null
          created_by: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['past_papers']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['past_papers']['Insert']>
      }
      user_progress: {
        Row: {
          id: string
          student_id: string
          xp: number
          level: number
          streak: number
          last_active_date: string | null
          weekly_goal: number
          lessons_this_week: number
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['user_progress']['Row'], 'id' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['user_progress']['Insert']>
      }
      modules: {
        Row: {
          id: string
          subject_id: string
          title: string
          description: string | null
          due_date: string | null
          is_published: boolean
          created_by: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['modules']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['modules']['Insert']>
      }
      module_questions: {
        Row: {
          id: string
          module_id: string
          question_id: string
          order_index: number
        }
        Insert: Omit<Database['public']['Tables']['module_questions']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['module_questions']['Insert']>
      }
      module_submissions: {
        Row: {
          id: string
          module_id: string
          student_id: string
          answers: Record<string, number>
          score: number | null
          total_questions: number | null
          submitted_at: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['module_submissions']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['module_submissions']['Insert']>
      }
      messages: {
        Row: {
          id: string
          sender_id: string
          recipient_id: string | null
          subject_id: string | null
          content: string
          is_group: boolean
          read: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['messages']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['messages']['Insert']>
      }
      announcements: {
        Row: {
          id: string
          teacher_id: string
          subject_id: string | null
          title: string
          body: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['announcements']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['announcements']['Insert']>
      }
      study_sessions: {
        Row: {
          id: string
          student_id: string
          subject_id: string | null
          duration_minutes: number
          xp_earned: number
          completed: boolean
          started_at: string
          completed_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['study_sessions']['Row'], 'id' | 'started_at'>
        Update: Partial<Database['public']['Tables']['study_sessions']['Insert']>
      }
      teacher_subjects: {
        Row: {
          id: string
          teacher_id: string
          subject_id: string
          assigned_at: string
        }
        Insert: Omit<Database['public']['Tables']['teacher_subjects']['Row'], 'id' | 'assigned_at'>
        Update: Partial<Database['public']['Tables']['teacher_subjects']['Insert']>
      }
      curriculum_units: {
        Row: {
          id: string
          subject_id: string
          title: string
          description: string | null
          year_group: YearGroup
          position: number
          created_by: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['curriculum_units']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['curriculum_units']['Insert']>
      }
      curriculum_topics: {
        Row: {
          id: string
          unit_id: string
          title: string
          description: string | null
          position: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['curriculum_topics']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['curriculum_topics']['Insert']>
      }
      curriculum_lessons: {
        Row: {
          id: string
          topic_id: string
          title: string
          learning_outcomes: string[]
          content: ContentBlock[]
          is_published: boolean
          position: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['curriculum_lessons']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['curriculum_lessons']['Insert']>
      }
      lesson_progress: {
        Row: {
          id: string
          student_id: string
          lesson_id: string
          is_completed: boolean
          completed_at: string | null
          manually_completed: boolean
        }
        Insert: Omit<Database['public']['Tables']['lesson_progress']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['lesson_progress']['Insert']>
      }
      lesson_notes: {
        Row: {
          id: string
          student_id: string
          lesson_id: string
          content: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['lesson_notes']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['lesson_notes']['Insert']>
      }
    }
    Views: {}
    Functions: {}
  }
}
