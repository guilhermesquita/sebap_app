'use client'

import React, { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { Plus, Trash2, Clock, BookOpen, Link as LinkIcon, FileUp } from 'lucide-react'
import StepModal from '@/components/ui/StepModal'
import Modal from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Checkbox } from '@/components/ui/Checkbox'
import { DatePicker } from '@/components/ui/DatePicker'
import { createClient } from '@/lib/supabase-client'
import { recalculatePresenceWeights } from '@/lib/presence-utils'
import { Aula } from '@/types/database'

export interface CreateOrEditAulaModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess?: () => void
    materiaId: string
    aulaToEdit?: Aula | null
}

interface TaskItem {
    id?: string
    name: string
    max_grade: string
}

interface LinkItem {
    title: string
    url: string
}

export function CreateOrEditAulaModal({
    isOpen,
    onClose,
    onSuccess,
    materiaId,
    aulaToEdit
}: CreateOrEditAulaModalProps) {
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [showCancelConfirm, setShowCancelConfirm] = useState(false)

    // Step 1 States
    const [title, setTitle] = useState('')
    const [startTime, setStartTime] = useState('')
    const [endTime, setEndTime] = useState('')
    const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])

    // Step 2 States
    const [isLastAula, setIsLastAula] = useState(false)
    const [tasks, setTasks] = useState<TaskItem[]>([])

    // Step 3 States
    const [links, setLinks] = useState<LinkItem[]>([])
    const [existingUploads, setExistingUploads] = useState<string[]>([])
    const [selectedFiles, setSelectedFiles] = useState<File[]>([])
    const [isDragging, setIsDragging] = useState(false)

    const fileInputRef = useRef<HTMLInputElement>(null)
    const supabase = createClient()
    const isEdit = !!aulaToEdit

    const handleReset = () => {
        setStep(1)
        setTitle('')
        setStartTime('')
        setEndTime('')
        setDate(new Date().toISOString().split('T')[0])
        setIsLastAula(false)
        setTasks([])
        setLinks([])
        setExistingUploads([])
        setSelectedFiles([])
        setShowCancelConfirm(false)
        setLoading(false)
    }

    const handleClose = () => {
        handleReset()
        onClose()
    }

    // Populate data when editing an existing aula
    useEffect(() => {
        if (isOpen && aulaToEdit) {
            setTitle(aulaToEdit.title || '')
            setDate(aulaToEdit.date ? aulaToEdit.date.split('T')[0] : new Date().toISOString().split('T')[0])
            setIsLastAula(aulaToEdit.is_last_aula || false)

            if (aulaToEdit.presence_time_ranges && aulaToEdit.presence_time_ranges.length > 0) {
                let firstRange: any = aulaToEdit.presence_time_ranges[0]
                if (typeof firstRange === 'string') {
                    try {
                        firstRange = JSON.parse(firstRange)
                    } catch { }
                }
                if (firstRange && typeof firstRange === 'object') {
                    setStartTime(firstRange.start || '')
                    setEndTime(firstRange.end || '')
                } else {
                    setStartTime('')
                    setEndTime('')
                }
            } else {
                setStartTime('')
                setEndTime('')
            }

            // Links parsing
            if (aulaToEdit.links && aulaToEdit.links.length > 0) {
                const parsedLinks = aulaToEdit.links.map((l: any) => {
                    if (typeof l === 'string') {
                        const trimmed = l.trim()
                        if (trimmed.startsWith('{')) {
                            try {
                                const obj = JSON.parse(trimmed)
                                return { title: obj.title || '', url: obj.url || '' }
                            } catch (e) { }
                        }
                        if (trimmed.includes('|')) {
                            const parts = trimmed.split('|')
                            const t = parts[0]?.trim() || ''
                            const u = parts.slice(1).join('|').trim() || ''
                            return { title: t, url: u }
                        }
                        return { title: '', url: trimmed }
                    }
                    if (typeof l === 'object' && l !== null) {
                        return { title: l.title || '', url: l.url || '' }
                    }
                    return { title: '', url: String(l) }
                })
                setLinks(parsedLinks)
            } else {
                setLinks([])
            }

            setExistingUploads(aulaToEdit.uploads || [])

            // Fetch tasks for this aula
            async function fetchAulaTasks() {
                const { data: tasksData } = await supabase
                    .from('aula_tasks')
                    .select('*')
                    .eq('aula_id', aulaToEdit!.id)

                if (tasksData && tasksData.length > 0) {
                    setTasks(tasksData.map(t => ({
                        id: t.id,
                        name: t.name,
                        max_grade: String(t.max_grade).replace('.', ',')
                    })))
                } else {
                    setTasks([])
                }
            }
            fetchAulaTasks()
        } else if (isOpen && !aulaToEdit) {
            handleReset()
        }
    }, [isOpen, aulaToEdit])

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files)
            setSelectedFiles(prev => [...prev, ...files])
        }
    }

    const handleRemoveSelectedFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index))
    }

    const handleRemoveExistingUpload = (url: string) => {
        setExistingUploads(prev => prev.filter(u => u !== url))
    }

    // Dynamic Task operations
    const addTask = () => {
        setTasks(prev => [...prev, { name: '', max_grade: '' }])
    }

    const removeTask = (index: number) => {
        setTasks(prev => prev.filter((_, i) => i !== index))
    }

    const updateTask = (index: number, field: 'name' | 'max_grade', value: string) => {
        setTasks(prev => {
            const updated = [...prev]
            if (field === 'max_grade') {
                // Grade formatting logic
                let val = value.replace(/\./g, ',').replace(/[^0-9,]/g, '')
                const commaIndex = val.indexOf(',')
                if (commaIndex !== -1) {
                    val = val.slice(0, commaIndex + 1) + val.slice(commaIndex + 1).replace(/,/g, '')
                }
                updated[index].max_grade = val
            } else {
                updated[index].name = value
            }
            return updated
        })
    }

    // Dynamic Link operations
    const addLink = () => {
        setLinks(prev => [...prev, { title: '', url: '' }])
    }

    const removeLink = (index: number) => {
        setLinks(prev => prev.filter((_, i) => i !== index))
    }

    const updateLink = (index: number, field: 'title' | 'url', value: string) => {
        setLinks(prev => {
            const updated = [...prev]
            updated[index][field] = value
            return updated
        })
    }

    const handleSubmit = async () => {
        setLoading(true)

        try {
            // Calculate time ranges
            const presenceTimeRanges = (startTime || endTime)
                ? [{ start: startTime, end: endTime }]
                : []

            // Calculate task grades
            const validTasks = isLastAula ? [] : tasks.filter(t => t.name.trim() !== '')
            const currentTasksGrade = validTasks.reduce((acc, t) => {
                const parsed = parseFloat(t.max_grade.replace(',', '.')) || 0
                return acc + parsed
            }, 0)

            // Upload files to Supabase Storage
            const uploadedUrls: string[] = [...existingUploads]
            for (const file of selectedFiles) {
                const fileExt = file.name.split('.').pop() || 'bin'
                const baseName = file.name.replace(`.${fileExt}`, '').replace(/[^a-z0-9]/gi, '_').toLowerCase()
                const fileName = `${baseName}_${Math.random().toString(36).substring(7)}.${fileExt}`
                const filePath = `${materiaId}/${fileName}`

                const { error: uploadError } = await supabase.storage
                    .from('aula-materials')
                    .upload(filePath, file, { upsert: true })

                if (uploadError) throw uploadError

                const { data: { publicUrl } } = supabase.storage
                    .from('aula-materials')
                    .getPublicUrl(filePath)

                uploadedUrls.push(publicUrl)
            }

            // Format links
            const formattedLinks = links
                .filter(l => l.url.trim() !== '')
                .map(l => l.title.trim() ? `${l.title.trim()}|${l.url.trim()}` : l.url.trim())

            if (isEdit && aulaToEdit) {
                // Update existing aula
                const { error: updateErr } = await supabase
                    .from('aulas')
                    .update({
                        title: title.trim() || null,
                        date: date || new Date().toISOString().split('T')[0],
                        is_last_aula: isLastAula,
                        presence_time_ranges: presenceTimeRanges,
                        tasks_count: validTasks.length,
                        tasks_max_grade: currentTasksGrade,
                        links: formattedLinks,
                        uploads: uploadedUrls,
                        attendance_open: true,
                    })
                    .eq('id', aulaToEdit.id)

                if (updateErr) throw updateErr

                // Sync tasks
                const currentTaskIds = validTasks.map(t => t.id).filter(Boolean) as string[]
                if (currentTaskIds.length > 0) {
                    await supabase.from('aula_tasks').delete().eq('aula_id', aulaToEdit.id).not('id', 'in', `(${currentTaskIds.join(',')})`)
                } else {
                    await supabase.from('aula_tasks').delete().eq('aula_id', aulaToEdit.id)
                }

                for (const t of validTasks) {
                    const parsedGrade = parseFloat(t.max_grade.replace(',', '.')) || 0
                    if (t.id) {
                        await supabase.from('aula_tasks').update({
                            name: t.name,
                            max_grade: parsedGrade
                        }).eq('id', t.id)
                    } else {
                        await supabase.from('aula_tasks').insert({
                            aula_id: aulaToEdit.id,
                            name: t.name,
                            max_grade: parsedGrade
                        })
                    }
                }
            } else {
                // Create new aula
                const { data: lastAula } = await supabase
                    .from('aulas')
                    .select('aula_number')
                    .eq('materia_id', materiaId)
                    .order('aula_number', { ascending: false })
                    .limit(1)
                    .single()

                const nextAulaNumber = (lastAula?.aula_number || 0) + 1

                const { data: newAula, error: insertErr } = await supabase
                    .from('aulas')
                    .insert({
                        materia_id: materiaId,
                        aula_number: nextAulaNumber,
                        title: title.trim() || null,
                        date: date || new Date().toISOString().split('T')[0],
                        is_last_aula: isLastAula,
                        presence_max_grade: 0,
                        presence_time_ranges: presenceTimeRanges,
                        tasks_count: validTasks.length,
                        tasks_max_grade: currentTasksGrade,
                        links: formattedLinks,
                        uploads: uploadedUrls,
                        attendance_open: true,
                    })
                    .select()
                    .single()

                if (insertErr) throw insertErr

                if (validTasks.length > 0) {
                    const tasksToInsert = validTasks.map(t => ({
                        aula_id: newAula.id,
                        name: t.name,
                        max_grade: parseFloat(t.max_grade.replace(',', '.')) || 0
                    }))

                    const { error: tasksErr } = await supabase
                        .from('aula_tasks')
                        .insert(tasksToInsert)

                    if (tasksErr) throw tasksErr
                }
            }

            await recalculatePresenceWeights(materiaId)

            handleClose()
            if (onSuccess) onSuccess()
        } catch (err: any) {
            alert(err.message || 'Erro ao salvar aula')
        } finally {
            setLoading(false)
        }
    }

    return (
        <StepModal
            isOpen={isOpen}
            onClose={handleClose}
            onCloseClick={() => setShowCancelConfirm(true)}
            onBackStep={() => setStep(prev => Math.max(1, prev - 1))}
            outsideCloseClick={false}
            currentStep={step}
            totalSteps={3}
            mobileFooter={
                step === 1 ? (
                    <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="w-full py-3.5 px-4 rounded-[12px] bg-[#38302A] text-white font-semibold text-[14px] hover:bg-brown-400 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                        Continuar →
                    </button>
                ) : step === 2 ? (
                    <button
                        type="button"
                        onClick={() => setStep(3)}
                        className="w-full py-3.5 px-4 rounded-[12px] bg-[#38302A] text-white font-semibold text-[14px] hover:bg-brown-400 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                        Continuar →
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full py-3.5 px-4 rounded-[12px] bg-[#38302A] text-white font-semibold text-[14px] hover:bg-brown-400 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                        {loading ? (isEdit ? 'Salvando...' : 'Publicando...') : (isEdit ? 'Salvar Alterações' : 'Publicar Aula')}
                    </button>
                )
            }
        >
            {step === 1 ? (
                <div className="flex flex-col gap-6">
                    {/* TEMA DA AULA (Opcional) */}
                    <div>
                        <label className="text-[#3A332C] text-[11px] font-bold tracking-wider uppercase mb-2 block">
                            TEMA DA AULA <span className="text-[#8C7A6B] font-normal lowercase">(Opcional)</span>
                        </label>
                        <Input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="ex: Introdução à Epistemologia Teológica e Revelação..."
                            icon={
                                <Image
                                    src="/icons/matery/book-materia-icon.svg"
                                    alt="Tema"
                                    width={18}
                                    height={18}
                                />
                            }
                            containerClassName="bg-[#FFF8F6] border-none h-[48px]"
                            containerStyle={{ borderRadius: '12px' }}
                        />
                    </div>

                    {/* HORÁRIOS PARA DAR PRESENÇA (Opcional) */}
                    <div>
                        <label className="text-[#3A332C] text-[11px] font-bold tracking-wider uppercase mb-2 block">
                            HORÁRIOS PARA DAR PRESENÇA <span className="text-[#8C7A6B] font-normal lowercase">(Opcional)</span>
                        </label>

                        <div className="grid grid-cols-2 gap-3">
                            <Input
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                icon={<Clock size={18} className="text-[#8C7A6B]" />}
                                containerClassName="bg-[#FFF8F6] border-none h-[48px]"
                                containerStyle={{ borderRadius: '12px' }}
                            />
                            <Input
                                type="time"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                icon={<Clock size={18} className="text-[#8C7A6B]" />}
                                containerClassName="bg-[#FFF8F6] border-none h-[48px]"
                                containerStyle={{ borderRadius: '12px' }}
                            />
                        </div>
                    </div>

                    {/* DATA DA AULA * */}
                    <div>
                        <label className="text-[#3A332C] text-[11px] font-bold tracking-wider uppercase mb-2 block">
                            DATA DA AULA <span className="text-[#D92D20] font-bold">*</span>
                        </label>
                        <DatePicker
                            value={date}
                            onChange={setDate}
                            placeholder="dd/mm/aaaa"
                        />
                    </div>

                    {/* Desktop Footer Step 1 */}
                    <div className="hidden md:flex items-center gap-3 mt-2">
                        <button
                            type="button"
                            onClick={() => setShowCancelConfirm(true)}
                            className="flex-1 py-3.5 px-4 rounded-[10px] border border-[#DFD8CE] bg-white text-[#4D453E] font-semibold text-[14px] hover:bg-[#F5F0EB] transition-colors cursor-pointer"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={() => setStep(2)}
                            className="flex-1 py-3.5 px-4 rounded-[10px] bg-[#38302A] text-white font-semibold text-[14px] hover:bg-brown-400 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                        >
                            Continuar →
                        </button>
                    </div>
                </div>
            ) : step === 2 ? (
                <div className="flex flex-col gap-6">
                    {/* Esta é a última aula? / Checkbox */}
                    <div className="border border-dashed border-[#EDE6DE] bg-[#FFF8F6] rounded-[16px] p-4 flex items-center gap-3 select-none">
                        <Checkbox
                            checked={isLastAula}
                            onChange={(e) => setIsLastAula(e.target.checked)}
                            label={<span className="text-[#3A332C] text-[14px] font-bold">Esta é a última aula?</span>}
                        />
                    </div>

                    {/* TAREFAS/ATIVIDADES (Opcional) */}
                    <div>
                        <label className="text-[#3A332C] text-[11px] font-bold tracking-wider uppercase mb-3 block">
                            TAREFAS/ATIVIDADES <span className="text-[#8C7A6B] font-normal lowercase">(Opcional)</span>
                        </label>

                        {tasks.length > 0 && (
                            <div className="flex items-center justify-between px-1 mb-2">
                                <span className="text-[#3A332C] text-[10px] font-bold tracking-wider uppercase">
                                    NOME DA TAREFA
                                </span>
                                <span className="text-[#3A332C] text-[10px] font-bold tracking-wider uppercase w-24 text-center mr-12">
                                    NOTA
                                </span>
                            </div>
                        )}

                        <div className="flex flex-col gap-3 mb-4">
                            {tasks.map((task, idx) => (
                                <div key={idx} className="flex items-center gap-3">
                                    <div className="flex-1">
                                        <Input
                                            type="text"
                                            value={task.name}
                                            onChange={(e) => updateTask(idx, 'name', e.target.value)}
                                            placeholder="Ex: Atividade da apostila"
                                            containerClassName="bg-[#FFF8F6] border-none h-[44px]"
                                            containerStyle={{ borderRadius: '10px' }}
                                        />
                                    </div>
                                    <input
                                        type="text"
                                        value={task.max_grade}
                                        onChange={(e) => updateTask(idx, 'max_grade', e.target.value)}
                                        placeholder="0,00"
                                        className="w-20 bg-[#FFF8F6] rounded-[10px] h-[44px] px-2 text-[#3A332C] font-bold text-center outline-none border border-transparent focus:border-[#DFD8CE] text-[14px]"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeTask(idx)}
                                        className="w-11 h-[44px] rounded-[10px] bg-[#FFF8F6] hover:bg-[#FEE2E2] border border-[#FEE2E2] text-danger flex items-center justify-center cursor-pointer transition-colors"
                                        title="Remover Tarefa"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={addTask}
                            className="w-full py-3 px-4 rounded-[12px] bg-[#38302A] text-white font-semibold text-[14px] hover:bg-brown-400 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                        >
                            Adicionar Atividade +
                        </button>
                    </div>

                    {/* Desktop Footer Step 2 */}
                    <div className="hidden md:flex items-center gap-3 mt-2">
                        <button
                            type="button"
                            onClick={() => setStep(1)}
                            className="flex-1 py-3.5 px-4 rounded-[10px] border border-[#DFD8CE] bg-white text-[#4D453E] font-semibold text-[14px] hover:bg-[#F5F0EB] transition-colors cursor-pointer"
                        >
                            Voltar
                        </button>
                        <button
                            type="button"
                            onClick={() => setStep(3)}
                            className="flex-1 py-3.5 px-4 rounded-[10px] bg-[#38302A] text-white font-semibold text-[14px] hover:bg-brown-400 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                        >
                            Continuar →
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col gap-6">
                    {/* LINKS DE APOIO (Opcional) */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-[#3A332C] text-[11px] font-bold tracking-wider uppercase block">
                                LINKS DE APOIO <span className="text-[#8C7A6B] font-normal lowercase">(Opcional)</span>
                            </label>
                            <button
                                type="button"
                                onClick={addLink}
                                className="bg-[#38302A] text-white text-[12px] px-3.5 py-1.5 rounded-[16px] font-semibold flex items-center gap-1 cursor-pointer hover:bg-brown-400 transition-colors"
                            >
                                <Plus size={14} /> Adicionar
                            </button>
                        </div>

                        <div className="flex flex-col gap-3">
                            {links.map((link, idx) => (
                                <div
                                    key={idx}
                                    className="border border-[#EDE6DE] bg-[#F7F3EE] rounded-[16px] p-4 flex flex-col gap-3"
                                >
                                    <div>
                                        <label className="text-[#3A332C] text-[10px] font-bold tracking-wider uppercase mb-1 block">
                                            TÍTULO
                                        </label>
                                        <input
                                            type="text"
                                            value={link.title}
                                            onChange={(e) => updateLink(idx, 'title', e.target.value)}
                                            placeholder="Digite o título do link..."
                                            className="w-full bg-white rounded-[12px] h-[44px] px-3 text-[#3A332C] placeholder:text-[#8C7A6B] text-[13px] outline-none border border-transparent focus:border-[#DFD8CE]"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[#3A332C] text-[10px] font-bold tracking-wider uppercase mb-1 block">
                                            LINK
                                        </label>
                                        <input
                                            type="url"
                                            value={link.url}
                                            onChange={(e) => updateLink(idx, 'url', e.target.value)}
                                            placeholder="https://exemplo.com"
                                            className="w-full bg-white rounded-[12px] h-[44px] px-3 text-[#3A332C] placeholder:text-[#8C7A6B] text-[13px] outline-none border border-transparent focus:border-[#DFD8CE]"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeLink(idx)}
                                        className="w-full py-2 bg-[#FFF8F6] hover:bg-[#FEE2E2] border border-[#FEE2E2] text-danger rounded-[10px] text-[12px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors mt-1"
                                    >
                                        Remover Link <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* MATERIAIS APOIO (Opcional) */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-[#3A332C] text-[11px] font-bold tracking-wider uppercase block">
                                MATERIAIS APOIO <span className="text-[#8C7A6B] font-normal lowercase">(Opcional)</span>
                            </label>
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="bg-[#38302A] text-white text-[12px] px-3.5 py-1.5 rounded-[16px] font-semibold flex items-center gap-1 cursor-pointer hover:bg-brown-400 transition-colors"
                            >
                                <Plus size={14} /> Enviar
                            </button>
                        </div>

                        <input
                            type="file"
                            ref={fileInputRef}
                            multiple
                            accept=".pdf,.pptx,.docx,image/*"
                            className="hidden"
                            onChange={handleFileSelect}
                        />

                        <div className="border border-[#EDE6DE] bg-[#F7F3EE] rounded-[16px] p-4 flex flex-col gap-3">
                            {/* Dropzone Box */}
                            <div
                                onDragOver={(e) => {
                                    e.preventDefault()
                                    setIsDragging(true)
                                }}
                                onDragLeave={(e) => {
                                    e.preventDefault()
                                    setIsDragging(false)
                                }}
                                onDrop={(e) => {
                                    e.preventDefault()
                                    setIsDragging(false)
                                    if (e.dataTransfer.files) {
                                        const files = Array.from(e.dataTransfer.files)
                                        setSelectedFiles(prev => [...prev, ...files])
                                    }
                                }}
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed border-[#EDE6DE] bg-white rounded-[12px] p-5 text-center cursor-pointer transition-colors flex flex-col items-center justify-center min-h-[90px] ${
                                    isDragging ? 'border-[#38302A] bg-[#FFF8F6]' : 'hover:bg-[#FFF8F6]'
                                }`}
                            >
                                <span className="text-[#8C7A6B] text-[13px] font-medium max-w-[280px]">
                                    Arraste ou clique para anexar apostilas (.pdf, .pptx, .docx até 25MB)
                                </span>
                            </div>

                            {/* Files List */}
                            {existingUploads.map((url, i) => {
                                const rawName = url.split('/').pop() || 'Arquivo'
                                const decodedName = decodeURIComponent(rawName.split('_').slice(0, -1).join('_') || rawName)
                                return (
                                    <div key={`existing-${i}`} className="bg-white rounded-[10px] p-3 flex items-center justify-between border border-[#EDE6DE]">
                                        <span className="text-[#3A332C] text-[12px] font-semibold truncate max-w-[240px]">
                                            {decodedName} (Existente)
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveExistingUpload(url)}
                                            className="text-danger p-1 hover:bg-[#FEE2E2] rounded-[6px] transition-colors cursor-pointer"
                                            title="Remover arquivo"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                )
                            })}

                            {selectedFiles.map((file, i) => (
                                <div key={`new-${i}`} className="bg-white rounded-[10px] p-3 flex items-center justify-between border border-[#EDE6DE]">
                                    <span className="text-[#3A332C] text-[12px] font-semibold truncate max-w-[240px]">
                                        {file.name} ({(file.size / 1024).toFixed(0)} KB)
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveSelectedFile(i)}
                                        className="text-danger p-1 hover:bg-[#FEE2E2] rounded-[6px] transition-colors cursor-pointer"
                                        title="Remover arquivo"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Desktop Footer Step 3 */}
                    <div className="hidden md:flex items-center gap-3 mt-2">
                        <button
                            type="button"
                            onClick={() => setStep(2)}
                            className="flex-1 py-3.5 px-4 rounded-[10px] border border-[#DFD8CE] bg-white text-[#4D453E] font-semibold text-[14px] hover:bg-[#F5F0EB] transition-colors cursor-pointer"
                        >
                            Voltar
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={loading}
                            className="flex-1 py-3.5 px-4 rounded-[10px] bg-[#38302A] text-white font-semibold text-[14px] hover:bg-brown-400 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                        >
                            {loading ? (isEdit ? 'Salvando...' : 'Publicando...') : (isEdit ? 'Salvar Alterações' : 'Publicar Aula')}
                        </button>
                    </div>
                </div>
            )}

            {/* Cancel Confirmation Modal */}
            <Modal
                isOpen={showCancelConfirm}
                onClose={() => setShowCancelConfirm(false)}
                outsideCloseClick={false}
                className="max-w-[420px]"
            >
                <div className="flex flex-col items-center text-center">
                    <h3 className="text-[#3A332C] text-[16px] font-bold mb-6">
                        Certeza que deseja cancelar a operação de {isEdit ? 'editar' : 'cadastrar uma nova'} aula?
                    </h3>
                    <div className="flex items-center gap-3 w-full">
                        <button
                            type="button"
                            onClick={() => setShowCancelConfirm(false)}
                            className="flex-1 py-3.5 px-4 rounded-[10px] border border-[#DFD8CE] bg-white text-[#4D453E] font-semibold text-[14px] hover:bg-[#F5F0EB] transition-colors cursor-pointer"
                        >
                            Não, continuar
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setShowCancelConfirm(false)
                                handleClose()
                            }}
                            className="flex-1 py-3.5 px-4 rounded-[10px] bg-[#38302A] text-white font-semibold text-[14px] hover:bg-brown-400 transition-colors cursor-pointer"
                        >
                            Sim, cancelar
                        </button>
                    </div>
                </div>
            </Modal>
        </StepModal>
    )
}

export default CreateOrEditAulaModal
