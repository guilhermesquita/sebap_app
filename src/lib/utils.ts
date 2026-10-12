import { MateriaStatus } from "@/types/database";

export function parseLocalDate(dateStr: string | null): Date | null {
    if (!dateStr) return null;

    const clean = dateStr.split('T')[0];
    const parts = clean.split('-');
    if (parts.length === 3) {
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    }

    return new Date(dateStr);
}

export function getMateriaStatus(startDate: string | null, endDate: string | null): MateriaStatus {
    if (!startDate || !endDate) return 'EM_BREVE';

    const now = new Date();
    // Reset hours to compare only dates
    const currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const start = parseLocalDate(startDate);
    if (!start) return 'EM_BREVE';
    const startT = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();

    const end = parseLocalDate(endDate);
    if (!end) return 'EM_BREVE';
    const endT = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();

    if (currentDate < startT) return 'EM_BREVE';
    if (currentDate > endT) return 'FINALIZADO';
    return 'EM_PROGRESSO';
}

export function formatStatus(status: MateriaStatus): string {
    const labels = {
        'EM_BREVE': 'Em Breve',
        'EM_PROGRESSO': 'Em Progresso',
        'FINALIZADO': 'Finalizado'
    };
    return labels[status] || status;
}

export function formatDateBR(dateStr: string | null): string {
    if (!dateStr) return '';
    const date = parseLocalDate(dateStr);
    if (!date) return '';
    return date.toLocaleDateString('pt-BR');
}

export function formatPhoneBR(value: string | null | undefined): string {
    if (!value) return '';
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length === 0) return '';
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function getManausCurrentMinutes(): number {
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

export function getTodayString(): string {
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

export function getAulaDateString(dateStr?: string | null): string {
    if (!dateStr) return ''
    const clean = dateStr.split('T')[0].split(' ')[0].trim()

    if (clean.includes('/')) {
        const parts = clean.split('/')
        if (parts.length === 3) {
            const day = parts[0].padStart(2, '0')
            const month = parts[1].padStart(2, '0')
            const year = parts[2]
            return `${year}-${month}-${day}`
        }
    }

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

export function isAulaConcluida(aula: any): boolean {
    if (!aula || !aula.date) return false

    const todayStr = getTodayString()
    const aulaStr = getAulaDateString(aula.date)
    if (!aulaStr) return false

    // If date is before today in Manaus, aula already completed
    if (aulaStr < todayStr) return true

    // If date is in future, not completed
    if (aulaStr > todayStr) return false

    // If date is today, check if presence time range has ended
    if (aula.presence_time_ranges) {
        let ranges: Array<{ start?: string; end?: string }> = []
        let raw = aula.presence_time_ranges
        if (typeof raw === 'string') {
            try { raw = JSON.parse(raw) } catch {}
        }
        if (Array.isArray(raw)) {
            ranges = raw.map((r: any) => {
                if (typeof r === 'string' && r.includes('-')) {
                    const [start, end] = r.split('-')
                    return { start: start.trim(), end: end.trim() }
                }
                return r && typeof r === 'object' ? r : {}
            }).filter(r => r && (r.start || r.end))
        }

        if (ranges.length > 0) {
            const currentMinutes = getManausCurrentMinutes()
            const maxEndMinutes = Math.max(...ranges.map(r => {
                const [endH, endM] = (r.end || '23:59').split(':').map(Number)
                return isNaN(endH) ? 1440 : endH * 60 + (endM || 0)
            }))
            return currentMinutes >= maxEndMinutes
        }
    }

    return false
}

export function calculateMateriaProgress(
    materia: {
        start_date?: string | null
        end_date?: string | null
        status?: MateriaStatus | string
        aulas?: any[]
        [key: string]: any
    }
): number {
    const todayStr = getTodayString()
    const endDateStr = materia.end_date ? getAulaDateString(materia.end_date) : ''
    const startDateStr = materia.start_date ? getAulaDateString(materia.start_date) : ''
    const status = materia.status || getMateriaStatus(materia.start_date || null, materia.end_date || null)

    // 1. Data Final: Se atingiu ou passou da data final (ou status FINALIZADO), progresso é 100%
    if (status === 'FINALIZADO' || (endDateStr && todayStr >= endDateStr)) {
        return 100
    }

    const aulasList = materia.aulas || []
    const totalAulas = aulasList.length

    // 2. Quantidade de aulas concluídas: se houver aulas cadastradas
    if (totalAulas > 0) {
        const completedAulas = aulasList.filter(isAulaConcluida).length

        // Se todas as aulas cadastradas já foram concluídas: 100%
        if (completedAulas >= totalAulas) {
            return 100
        }

        // Progresso proporcional à quantidade de aulas concluídas
        return Math.min(100, Math.max(0, Math.round((completedAulas / totalAulas) * 100)))
    }

    // 3. Se ainda não há aulas cadastradas, mas há data de início e data final:
    // Progresso baseado no tempo decorrido até a data final
    if (startDateStr && endDateStr) {
        const start = parseLocalDate(startDateStr)?.getTime()
        const end = parseLocalDate(endDateStr)?.getTime()
        const now = new Date().getTime()

        if (start && end && end > start) {
            if (now <= start) return 0
            if (now >= end) return 100
            return Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)))
        }
    }

    return 0
}

