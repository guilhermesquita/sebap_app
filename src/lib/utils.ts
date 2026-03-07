import { MateriaStatus } from "@/types/database";

export function getMateriaStatus(startDate: string | null, endDate: string | null): MateriaStatus {
    if (!startDate || !endDate) return 'EM_BREVE';

    const now = new Date();
    // Reset hours to compare only dates
    const currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const start = new Date(startDate);
    const startT = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();

    const end = new Date(endDate);
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
