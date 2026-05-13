export type CareerAvatarDef = {
  id: string
  label: string
  color: string
  icon: string // inner SVG content, no outer <svg> tag
}

function wrap(color: string, icon: string) {
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="50" fill="${color}"/>${icon}</svg>`
}

export const CAREER_AVATARS: CareerAvatarDef[] = [
  {
    id: 'doctor',
    label: 'Doctor',
    color: '#3B82F6',
    icon: `
      <rect x="42" y="22" width="16" height="56" rx="8" fill="white"/>
      <rect x="22" y="42" width="56" height="16" rx="8" fill="white"/>`,
  },
  {
    id: 'engineer',
    label: 'Engineer',
    color: '#F97316',
    icon: `
      <path d="M15,58 A35,34 0 0,1 85,58 Z" fill="white"/>
      <rect x="12" y="55" width="76" height="11" rx="5" fill="white"/>
      <rect x="43" y="22" width="14" height="36" rx="3" fill="white"/>`,
  },
  {
    id: 'teacher',
    label: 'Teacher',
    color: '#8B5CF6',
    icon: `
      <polygon points="50,22 80,44 50,52 20,44" fill="white"/>
      <rect x="26" y="44" width="48" height="10" rx="2" fill="white"/>
      <rect x="77" y="44" width="3" height="22" rx="1" fill="white"/>
      <circle cx="78" cy="70" r="5" fill="white"/>`,
  },
  {
    id: 'pilot',
    label: 'Pilot',
    color: '#0EA5E9',
    icon: `
      <ellipse cx="50" cy="50" rx="7" ry="30" fill="white"/>
      <ellipse cx="50" cy="46" rx="34" ry="9" fill="white"/>
      <ellipse cx="50" cy="72" rx="17" ry="6" fill="white"/>`,
  },
  {
    id: 'lawyer',
    label: 'Lawyer',
    color: '#1E40AF',
    icon: `
      <rect x="47" y="22" width="6" height="52" rx="3" fill="white"/>
      <rect x="20" y="29" width="60" height="5" rx="2" fill="white"/>
      <rect x="22" y="34" width="3" height="20" rx="1" fill="white"/>
      <rect x="75" y="34" width="3" height="20" rx="1" fill="white"/>
      <path d="M13,54 Q23,64 33,54" stroke="white" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M67,54 Q77,64 87,54" stroke="white" stroke-width="4" fill="none" stroke-linecap="round"/>
      <rect x="34" y="72" width="32" height="6" rx="3" fill="white"/>`,
  },
  {
    id: 'scientist',
    label: 'Scientist',
    color: '#10B981',
    icon: `
      <rect x="41" y="14" width="18" height="7" rx="3" fill="white"/>
      <rect x="43" y="20" width="14" height="22" rx="4" fill="white"/>
      <path d="M43,42 L22,74 Q20,82 30,82 L70,82 Q80,82 78,74 L57,42 Z" fill="white"/>
      <path d="M34,68 L22,74 Q20,82 30,82 L70,82 Q80,82 78,74 L66,68 Z" fill="#059669" opacity="0.5"/>
      <circle cx="44" cy="70" r="4" fill="white" opacity="0.9"/>
      <circle cx="57" cy="76" r="3" fill="white" opacity="0.9"/>`,
  },
  {
    id: 'artist',
    label: 'Artist',
    color: '#EC4899',
    icon: `
      <path d="M22,58 Q18,28 44,20 Q68,14 78,36 Q86,54 74,68 Q65,76 56,70 Q50,65 44,70 Q28,76 22,58 Z" fill="white"/>
      <circle cx="34" cy="58" r="9" fill="#EC4899"/>
      <circle cx="48" cy="28" r="5" fill="#EF4444"/>
      <circle cx="62" cy="24" r="5" fill="#3B82F6"/>
      <circle cx="73" cy="38" r="5" fill="#10B981"/>
      <circle cx="72" cy="54" r="5" fill="#F59E0B"/>`,
  },
  {
    id: 'chef',
    label: 'Chef',
    color: '#EF4444',
    icon: `
      <circle cx="50" cy="38" r="22" fill="white"/>
      <circle cx="32" cy="44" r="14" fill="white"/>
      <circle cx="68" cy="44" r="14" fill="white"/>
      <rect x="26" y="54" width="48" height="13" rx="2" fill="white"/>
      <rect x="28" y="65" width="44" height="8" rx="1" fill="white"/>`,
  },
  {
    id: 'athlete',
    label: 'Athlete',
    color: '#F59E0B',
    icon: `
      <path d="M30,22 L28,56 Q28,66 50,66 Q72,66 72,56 L70,22 Z" fill="white"/>
      <path d="M28,30 Q16,34 16,45 Q16,56 28,50" stroke="white" stroke-width="6" fill="none" stroke-linecap="round"/>
      <path d="M72,30 Q84,34 84,45 Q84,56 72,50" stroke="white" stroke-width="6" fill="none" stroke-linecap="round"/>
      <rect x="45" y="66" width="10" height="11" rx="1" fill="white"/>
      <rect x="32" y="75" width="36" height="8" rx="4" fill="white"/>`,
  },
  {
    id: 'programmer',
    label: 'Programmer',
    color: '#334155',
    icon: `
      <polyline points="32,32 14,50 32,68" stroke="white" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <polyline points="68,32 86,50 68,68" stroke="white" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="58" y1="26" x2="42" y2="74" stroke="white" stroke-width="6" stroke-linecap="round"/>`,
  },
  {
    id: 'entrepreneur',
    label: 'Entrepreneur',
    color: '#0D9488',
    icon: `
      <circle cx="50" cy="40" r="23" fill="white"/>
      <rect x="38" y="61" width="24" height="5" rx="0" fill="white"/>
      <rect x="38" y="68" width="24" height="5" rx="0" fill="white"/>
      <rect x="38" y="74" width="24" height="8" rx="4" fill="white"/>
      <line x1="50" y1="13" x2="50" y2="6" stroke="white" stroke-width="4" stroke-linecap="round"/>
      <line x1="26" y1="20" x2="21" y2="15" stroke="white" stroke-width="4" stroke-linecap="round"/>
      <line x1="74" y1="20" x2="79" y2="15" stroke="white" stroke-width="4" stroke-linecap="round"/>
      <line x1="15" y1="40" x2="8" y2="40" stroke="white" stroke-width="4" stroke-linecap="round"/>
      <line x1="85" y1="40" x2="92" y2="40" stroke="white" stroke-width="4" stroke-linecap="round"/>`,
  },
  {
    id: 'nurse',
    label: 'Nurse',
    color: '#F43F5E',
    icon: `
      <circle cx="34" cy="18" r="7" fill="white"/>
      <circle cx="66" cy="18" r="7" fill="white"/>
      <line x1="34" y1="25" x2="34" y2="46" stroke="white" stroke-width="5" stroke-linecap="round"/>
      <line x1="66" y1="25" x2="66" y2="46" stroke="white" stroke-width="5" stroke-linecap="round"/>
      <path d="M34,46 Q50,56 66,46" stroke="white" stroke-width="5" fill="none" stroke-linecap="round"/>
      <line x1="50" y1="56" x2="50" y2="70" stroke="white" stroke-width="5" stroke-linecap="round"/>
      <circle cx="50" cy="79" r="11" fill="white"/>
      <circle cx="50" cy="79" r="5" fill="#F43F5E" opacity="0.5"/>`,
  },
  {
    id: 'architect',
    label: 'Architect',
    color: '#6366F1',
    icon: `
      <polygon points="50,18 22,36 78,36" fill="white"/>
      <rect x="25" y="35" width="50" height="46" rx="2" fill="white"/>
      <rect x="32" y="45" width="12" height="12" rx="1" fill="#6366F1"/>
      <rect x="56" y="45" width="12" height="12" rx="1" fill="#6366F1"/>
      <rect x="40" y="64" width="20" height="17" rx="2" fill="#6366F1"/>
      <circle cx="57" cy="73" r="2" fill="white"/>`,
  },
  {
    id: 'vet',
    label: 'Vet',
    color: '#65A30D',
    icon: `
      <ellipse cx="50" cy="64" rx="20" ry="18" fill="white"/>
      <circle cx="32" cy="44" r="9" fill="white"/>
      <circle cx="45" cy="37" r="9" fill="white"/>
      <circle cx="59" cy="37" r="9" fill="white"/>
      <circle cx="70" cy="44" r="9" fill="white"/>`,
  },
]

export function isCareerAvatar(url: string | null | undefined): boolean {
  return typeof url === 'string' && url.startsWith('bims-career:')
}

export function getCareerIdFromUrl(url: string): string {
  return url.replace('bims-career:', '')
}

export function careerAvatarUrl(id: string): string {
  return `bims-career:${id}`
}

export function getCareerSvgString(id: string): string {
  const career = CAREER_AVATARS.find(c => c.id === id)
  if (!career) return ''
  return wrap(career.color, career.icon)
}

export function getCareerDataUri(id: string): string {
  const svg = getCareerSvgString(id)
  if (!svg) return ''
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

export function resolveAvatarSrc(url: string | null | undefined): string | null {
  if (!url) return null
  if (isCareerAvatar(url)) return getCareerDataUri(getCareerIdFromUrl(url))
  return url
}
