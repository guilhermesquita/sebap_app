'use client'

import React from 'react'
import MateryIcon from '@/components/ui/MateryIcon'
import { Aula, AulaTask, PresencaTarefa } from '@/types/database'
import { formatDateBR, parseLocalDate } from '@/lib/utils'

interface LinkItem {
  title: string
  url: string
  description?: string
}

interface MaterialItem {
  name: string
  url: string
  size?: string
  description?: string
}

function getManausCurrentMinutes(): number {
  try {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Manaus',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    const parts = formatter.formatToParts(now)
    let hour = 0
    let minute = 0
    for (const part of parts) {
      if (part.type === 'hour') hour = parseInt(part.value, 10)
      if (part.type === 'minute') minute = parseInt(part.value, 10)
    }
    if (hour === 24) hour = 0
    return hour * 60 + minute
  } catch {
    const now = new Date()
    return now.getHours() * 60 + now.getMinutes()
  }
}

function getTodayString(): string {
  try {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Manaus',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    const parts = formatter.formatToParts(now)
    let year = ''
    let month = ''
    let day = ''
    for (const part of parts) {
      if (part.type === 'year') year = part.value
      if (part.type === 'month') month = part.value
      if (part.type === 'day') day = part.value
    }
    return `${year}-${month}-${day}`
  } catch {
    const d = new Date()
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
}

function getAulaDateString(dateStr?: string | null): string {
  if (!dateStr) return ''
  const clean = dateStr.split('T')[0].split(' ')[0].trim()

  // Handle DD/MM/YYYY format
  if (clean.includes('/')) {
    const parts = clean.split('/')
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0')
      const month = parts[1].padStart(2, '0')
      const year = parts[2]
      return `${year}-${month}-${day}`
    }
  }

  // Handle YYYY-MM-DD format
  if (clean.includes('-')) {
    const parts = clean.split('-')
    if (parts.length === 3) {
      const year = parts[0]
      const month = parts[1].padStart(2, '0')
      const day = parts[2].padStart(2, '0')
      return `${year}-${month}-${day}`
    }
  }

  return clean
}

function getAulaDateStatus(dateStr?: string | null) {
  if (!dateStr) return { isFuture: false, isToday: true, isPast: false }

  const todayStr = getTodayString()
  const aulaStr = getAulaDateString(dateStr)

  if (!aulaStr) return { isFuture: false, isToday: true, isPast: false }

  return {
    isFuture: aulaStr > todayStr,
    isToday: aulaStr === todayStr,
    isPast: aulaStr < todayStr,
  }
}

function checkPresenceTimeAllowed(aula: Aula, isToday: boolean): boolean {
  let ranges: Array<{ start?: string; end?: string }> = []

  let raw = aula.presence_time_ranges
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw)
    } catch { }
  }

  if (Array.isArray(raw)) {
    ranges = raw.map((r: any) => {
      if (typeof r === 'string') {
        const trimmed = r.trim()
        if (trimmed.startsWith('{')) {
          try {
            const parsed = JSON.parse(trimmed)
            if (parsed && typeof parsed === 'object') return parsed
          } catch { }
        }
        if (trimmed.includes('-')) {
          const [start, end] = trimmed.split('-')
          return { start: start.trim(), end: end.trim() }
        }
      }
      if (typeof r === 'object' && r !== null) {
        return r
      }
      return {}
    }).filter(r => r && (r.start || r.end))
  }

  if (ranges.length > 0) {
    if (!isToday && aula.date) return false

    const currentMinutes = getManausCurrentMinutes()

    return ranges.some((range) => {
      if (!range) return false
      const startStr = range.start || '00:00'
      const endStr = range.end || '23:59'
      const [startH, startM] = startStr.split(':').map(Number)
      const [endH, endM] = endStr.split(':').map(Number)
      if (isNaN(startH) || isNaN(endH)) return false
      const startMin = startH * 60 + (startM || 0)
      const endMin = endH * 60 + (endM || 0)

      if (endMin < startMin) {
        return currentMinutes >= startMin || currentMinutes <= endMin
      }

      return currentMinutes >= startMin && currentMinutes <= endMin
    })
  }

  return isToday || !aula.date
}

interface AulaCardProps {
  aula: Aula
  isAdmin?: boolean
  isEnrolled?: boolean
  tasks?: AulaTask[]
  presencas?: PresencaTarefa[]
  currentUserId?: string
  onEditAula?: (aula: Aula) => void
  onDeleteAula?: (aula: Aula) => void
  onVerLista?: (aula: Aula) => void
  onLancarPresenca?: (aula: Aula) => void
  onAnexarNota?: (aula: Aula) => void
}

export const AulaCard: React.FC<AulaCardProps> = ({
  aula,
  isAdmin = false,
  isEnrolled = false,
  tasks = [],
  presencas = [],
  currentUserId,
  onEditAula,
  onDeleteAula,
  onVerLista,
  onLancarPresenca,
  onAnexarNota,
}) => {
  // Parse links if JSON or string array
  let links: LinkItem[] = []
  if (Array.isArray(aula.links)) {
    links = aula.links.map((link: any) => {
      if (typeof link === 'string') {
        const trimmed = link.trim()
        if (trimmed.startsWith('{')) {
          try {
            const parsed = JSON.parse(trimmed)
            if (typeof parsed === 'object' && parsed !== null) {
              const rawTitle = parsed.title ? String(parsed.title).trim() : ''
              return {
                title: rawTitle || 'Link Externo',
                url: parsed.url || '',
                description: parsed.description
              }
            }
          } catch (e) { }
        }
        if (trimmed.includes('|')) {
          const parts = trimmed.split('|')
          const rawTitle = parts[0] ? parts[0].trim() : ''
          const rawUrl = parts.slice(1).join('|').trim()
          return {
            title: rawTitle || 'Link Externo',
            url: rawUrl || trimmed
          }
        }
        return { title: 'Link Externo', url: trimmed }
      }
      if (typeof link === 'object' && link !== null) {
        const rawTitle = link.title ? String(link.title).trim() : ''
        return {
          title: rawTitle || 'Link Externo',
          url: link.url || '',
          description: link.description
        }
      }
      return { title: 'Link Externo', url: String(link) }
    })
  }

  // Parse uploads/materials if JSON or string array
  let materials: MaterialItem[] = []
  if (Array.isArray(aula.uploads)) {
    materials = aula.uploads.map((upload: any) => {
      if (typeof upload === 'string') {
        const filename = upload.split('/').pop() || 'arquivo_anexo.pdf'
        return {
          name: filename,
          url: upload,
          size: '142 KB',
          description: 'Documento complementar de estudo acadêmico',
        }
      }
      return upload
    })
  }

  // Check presence status for student
  const studentPresenca = presencas.find((p) => p.aluno_id === currentUserId && p.aula_id === aula.id)
  const isPresent = studentPresenca?.presence === true
  const isAbsent = studentPresenca?.presence === false

  const hasContent = links.length > 0 || tasks.length > 0 || materials.length > 0

  return (
    <div className="bg-white rounded-[20px] p-6 border border-[#EDE6DE] shadow-xs flex flex-col gap-5 hover:shadow-sm transition-shadow">
      {/* Aula Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left Info: Title, Date, Description */}
        <div className="flex flex-col gap-1">
          <h2 className="text-[18px] font-extrabold text-[#3A332C] tracking-tight">
            AULA {aula.aula_number}
          </h2>

          <div className="flex items-center gap-2 text-[#7E756D] text-[13px] font-medium flex-wrap">
            <div className="flex items-center gap-1.5">
              <MateryIcon name="calendar" size={13} color="#7E756D" />
              <span>{aula.date ? formatDateBR(aula.date) : 'Data a definir'}</span>
            </div>
            {aula.title && (
              <>
                <span>·</span>
                <span className="text-[#4D453E]">{aula.title}</span>
              </>
            )}
          </div>
        </div>

        {/* Right Actions / Status */}
        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin ? (
            <>
              {/* Edit pen icon button */}
              {onEditAula && (
                <button
                  type="button"
                  onClick={() => onEditAula(aula)}
                  className="w-9 h-9 rounded-[10px] bg-[#F8F2F0] border border-[#EDE6DE] flex items-center justify-center text-[#3A332C] hover:bg-[#FBEFE9] transition-colors cursor-pointer"
                  title="Editar aula"
                >
                  <MateryIcon name="pen" size={14} color="#3A332C" />
                </button>
              )}

              {/* Ver Lista Button */}
              {onVerLista && (
                <button
                  type="button"
                  onClick={() => onVerLista(aula)}
                  className="px-3.5 py-2 rounded-[10px] bg-[#F8F2F0] border border-[#EDE6DE] text-[#3A332C] text-[12px] font-bold flex items-center gap-1.5 hover:bg-[#FBEFE9] transition-colors cursor-pointer"
                >
                  <MateryIcon name="group" size={14} color="#3A332C" />
                  <span>Ver Lista</span>
                </button>
              )}

              {/* Lançar Presença Button */}
              {onLancarPresenca && (
                <button
                  type="button"
                  onClick={() => onLancarPresenca(aula)}
                  className="px-3.5 py-2 rounded-[10px] bg-[#CFC4BE] text-[#3A332C] text-[12px] font-bold flex items-center gap-1.5 hover:bg-[#DFD8CE] transition-colors cursor-pointer"
                >
                  <MateryIcon name="check-presence" size={14} color="#3A332C" />
                  <span>Lançar Presença</span>
                </button>
              )}

              {/* Deletar Aula Button */}
              {onDeleteAula && (
                <button
                  type="button"
                  onClick={() => onDeleteAula(aula)}
                  className="px-3.5 py-2 rounded-[10px] bg-[#FEE2E2] text-[#D92D20] text-[12px] font-bold flex items-center gap-1.5 hover:bg-[#FECDCD] transition-colors cursor-pointer"
                >
                  <MateryIcon name="trash" size={13} color="#D92D20" />
                  <span>Deletar aula</span>
                </button>
              )}
            </>
          ) : (() => {
            const { isFuture, isToday } = getAulaDateStatus(aula.date)

            // 1. If aula date is in the future relative to today, render nothing
            if (isFuture) return null

            // 2. If student already has recorded presenca:
            if (studentPresenca) {
              return isPresent ? (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#E6F7ED] text-[#027A48] text-[12px] font-bold">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <circle cx="6" cy="6" r="6" fill="#027A48" />
                    <path d="M3.5 6L5 7.5L8.5 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Presente
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#FEE2E2] text-[#D92D20] text-[12px] font-bold">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <circle cx="6" cy="6" r="6" fill="#D92D20" />
                    <path d="M4 4L8 8M8 4L4 8" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.9" />
                  </svg>
                  Faltante
                </span>
              )
            }

            // 3. If no presenca recorded, check if launch time window is allowed right now
            const isTimeAllowed = checkPresenceTimeAllowed(aula, isToday)

            if (isTimeAllowed && onLancarPresenca) {
              return (
                <button
                  type="button"
                  onClick={() => onLancarPresenca(aula)}
                  className="px-4 py-2 rounded-[10px] bg-[#EDE6DE] text-[#3A332C] text-[12px] font-bold flex items-center gap-1.5 hover:bg-[#DFD8CE] transition-colors cursor-pointer"
                >
                  <MateryIcon name="check-presence" size={14} color="#3A332C" />
                  <span>Lançar Presença</span>
                </button>
              )
            }

            // 4. If student is not enrolled, do not display Faltante badge
            if (!isEnrolled) {
              return null
            }

            // 5. Otherwise (time passed / not allowed and enrolled), render Faltante badge
            return (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#FEE2E2] text-[#D92D20] text-[12px] font-bold">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <circle cx="6" cy="6" r="6" fill="#D92D20" />
                  <path d="M4 4L8 8M8 4L4 8" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.9" />
                </svg>
                Faltante
              </span>
            )
          })()}
        </div>
      </div>

      {/* LINKS ÚTEIS Section */}
      {links.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-bold text-[#8C7A6B] tracking-wider uppercase">
            LINKS ÚTEIS
          </span>

          <div className="flex flex-col gap-2">
            {links.map((link, index) => (
              <a
                key={index}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#FFF8F6] border border-[#EDE6DE] rounded-[14px] p-3.5 flex items-center justify-between gap-3 hover:bg-[#FDF3EE] transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-[10px] bg-[#EDE6DE] flex items-center justify-center shrink-0">
                    <MateryIcon name="link" size={16} color="#3A332C" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[13px] font-bold text-[#3A332C] leading-snug">
                      {link.title || 'Link Externo'}
                    </span>
                    {link.description && (
                      <span className="text-[11px] text-[#8C7A6B]">
                        {link.description}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-[#8C7A6B] group-hover:text-[#3A332C] transition-colors shrink-0">
                  <MateryIcon name="new-tab" size={14} color="currentColor" />
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* TAREFAS ATRIBUÍDAS Section */}
      {tasks.length > 0 && (
        <div className="bg-[#FFF8F6] border border-[#EDE6DE] rounded-[14px] p-3.5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-[8px] bg-[#EDE6DE] flex items-center justify-center shrink-0">
            <MateryIcon name="clipboard-check" size={15} color="#3A332C" />
          </div>
          <div className="flex items-center gap-2 text-[12px] text-[#4D453E] flex-wrap">
            <span className="font-bold text-[#3A332C]">
              Tarefas atribuídas: {tasks.length} (Vale {aula.tasks_max_grade || 3} pts)
            </span>
            <span>—</span>
            <span>{tasks.map((t) => t.name).join(', ')}</span>
          </div>
        </div>
      )}

      {/* MATERIAIS Section */}
      {materials.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-bold text-[#8C7A6B] tracking-wider uppercase">
            MATERIAIS
          </span>

          <div className="flex flex-col gap-2">
            {materials.map((mat, index) => (
              <div
                key={index}
                className="bg-[#FFF8F6] border border-[#EDE6DE] rounded-[14px] p-3.5 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-[10px] bg-[#FEE2E2] flex items-center justify-center shrink-0">
                    <MateryIcon name="file" size={16} color="#BA1A1A" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[13px] font-bold text-[#3A332C] leading-snug">
                      {mat.name}
                    </span>
                    <span className="text-[11px] text-[#8C7A6B]">
                      {mat.description || 'Documento de estudo complementar'} {mat.size ? `· ${mat.size}` : ''}
                    </span>
                  </div>
                </div>

                <a
                  href={mat.url}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 rounded-[8px] bg-white border border-[#EDE6DE] text-[#3A332C] text-[12px] font-bold flex items-center gap-1.5 hover:bg-[#FFF8F6] transition-colors cursor-pointer shrink-0"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M6 1V8M6 8L3.5 5.5M6 8L8.5 5.5M1 10.5H11" stroke="#3A332C" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>Baixar</span>
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State (no tasks/materials) */}
      {!hasContent && (
        <div className="bg-[#FFF8F6] border border-[#EDE6DE] rounded-[14px] p-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-[#8C7A6B] text-[12px]">
            <MateryIcon name="info" size={15} color="#8C7A6B" />
            <span>Sem tarefas pendentes ou materiais extras anexados a esta sessão.</span>
          </div>

          {isAdmin && onAnexarNota && (
            <button
              type="button"
              onClick={() => onAnexarNota(aula)}
              className="px-3 py-1.5 rounded-[8px] bg-white border border-[#EDE6DE] text-[#3A332C] text-[11px] font-bold hover:bg-[#FFF8F6] transition-colors cursor-pointer shrink-0"
            >
              + Anexar Nota
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default AulaCard
