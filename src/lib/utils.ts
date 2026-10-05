import { MateriaStatus } from "@/types/database";

export function parseLocalDate(dateStr: string | null): Date | null {
    if (!dateStr) return null;

    // If it's already a full ISO string with time/timezone, use standard constructor
    if (dateStr.includes('T')) return new Date(dateStr);

    // If it's just YYYY-MM-DD, parse manually to avoid UTC conversion
    const parts = dateStr.split('-');
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
