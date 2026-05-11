const DB_NAME = 'bims-offline'
const DB_VERSION = 1

export interface OfflineQuestion {
  id: string
  subject_id: string
  topic_id: string
  question: string
  options: string[]
  correct_answer: number
  explanation: string | null
  difficulty: string
}

export interface OfflineFlashcard {
  id: string
  subject_id: string
  topic_id: string
  term: string
  definition: string
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains('quiz_questions')) {
        const qs = db.createObjectStore('quiz_questions', { keyPath: 'id' })
        qs.createIndex('subject_id', 'subject_id', { unique: false })
      }
      if (!db.objectStoreNames.contains('flashcards')) {
        const fs = db.createObjectStore('flashcards', { keyPath: 'id' })
        fs.createIndex('subject_id', 'subject_id', { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function cacheQuestions(questions: OfflineQuestion[]): Promise<void> {
  const db = await openDB()
  const tx = db.transaction('quiz_questions', 'readwrite')
  const store = tx.objectStore('quiz_questions')
  for (const q of questions) store.put(q)
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => { db.close(); resolve() }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

export async function cacheFlashcards(cards: OfflineFlashcard[]): Promise<void> {
  const db = await openDB()
  const tx = db.transaction('flashcards', 'readwrite')
  const store = tx.objectStore('flashcards')
  for (const c of cards) store.put(c)
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => { db.close(); resolve() }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

export async function getOfflineQuestions(subjectId: string, topicId?: string): Promise<OfflineQuestion[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('quiz_questions', 'readonly')
    const request = tx.objectStore('quiz_questions').index('subject_id').getAll(subjectId)
    request.onsuccess = () => {
      db.close()
      let results = request.result as OfflineQuestion[]
      if (topicId) results = results.filter(q => q.topic_id === topicId)
      resolve(results)
    }
    request.onerror = () => { db.close(); reject(request.error) }
  })
}

export async function getOfflineFlashcards(subjectId: string, topicId?: string): Promise<OfflineFlashcard[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('flashcards', 'readonly')
    const request = tx.objectStore('flashcards').index('subject_id').getAll(subjectId)
    request.onsuccess = () => {
      db.close()
      let results = request.result as OfflineFlashcard[]
      if (topicId) results = results.filter(c => c.topic_id === topicId)
      resolve(results)
    }
    request.onerror = () => { db.close(); reject(request.error) }
  })
}
