import { createClient } from './supabase-client'

export async function recalculatePresenceWeights(materiaId: string) {
    const supabase = createClient()

    try {
        // 1. Pegar a matéria para saber a nota total de presença
        const { data: materia, error: materiaError } = await supabase
            .from('materias')
            .select('presence_max_grade')
            .eq('id', materiaId)
            .single()

        if (materiaError) throw materiaError

        const totalPresenceGrade = Number(materia.presence_max_grade || 0)

        // 2. Contar quantas aulas existem para essa matéria
        const { data: aulas, error: aulasError } = await supabase
            .from('aulas')
            .select('id')
            .eq('materia_id', materiaId)

        if (aulasError) throw aulasError

        const numAulas = aulas.length

        if (numAulas === 0) return // Sem aulas, sem necessidade de recalcular

        // 3. Calcular o peso de cada aula
        const weightPerAula = totalPresenceGrade / numAulas

        // 4. Atualizar o max_grade de cada aula
        const aulaIds = aulas.map(a => a.id)
        
        const { error: updateAulasError } = await supabase
            .from('aulas')
            .update({ presence_max_grade: weightPerAula })
            .in('id', aulaIds)

        if (updateAulasError) throw updateAulasError

        // 5. Atualizar todas as presenças já lançadas para essas aulas
        // Só atualiza para quem ESTAVA presente (presence = true)
        const { error: updatePresencasError } = await supabase
            .from('presencas_tarefas')
            .update({ presence_grade: weightPerAula })
            .in('aula_id', aulaIds)
            .eq('presence', true)

        if (updatePresencasError) throw updatePresencasError

        console.log(`[recalculatePresenceWeights] Recalculado com sucesso. Matéria: ${materiaId}, Peso: ${weightPerAula}`)
    } catch (error) {
        console.error('[recalculatePresenceWeights] Erro ao recalcular pesos de presença:', error)
        throw error
    }
}
