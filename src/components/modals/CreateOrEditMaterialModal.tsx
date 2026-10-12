'use client'

import React, { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { Pencil, Trash2 } from 'lucide-react'
import StepModal from '@/components/ui/StepModal'
import Modal from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Checkbox } from '@/components/ui/Checkbox'
import { DatePicker } from '@/components/ui/DatePicker'
import { createClient } from '@/lib/supabase-client'
import { getMateriaStatus } from '@/lib/utils'

export interface MateriaData {
    id?: string
    name: string
    banner_url?: string | null
    description?: string | null
    start_date?: string | null
    end_date?: string | null
    min_grade?: number | null
    max_grade?: number | null
    presence_max_grade?: number | null
    has_final_exam?: boolean | null
}

export interface CreateOrEditMaterialModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess?: () => void
    initialData?: MateriaData | null
}

export function CreateOrEditMaterialModal({
    isOpen,
    onClose,
    onSuccess,
    initialData
}: CreateOrEditMaterialModalProps) {
    const isEdit = !!initialData?.id

    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const supabase = createClient()

    // Form state
    const [name, setName] = useState('')
    const [bannerUrl, setBannerUrl] = useState('')
    const [fileToUpload, setFileToUpload] = useState<File | null>(null)
    const [filePreview, setFilePreview] = useState<string | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [showCancelConfirm, setShowCancelConfirm] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [description, setDescription] = useState('')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [minGrade, setMinGrade] = useState('6,00')
    const [maxGrade, setMaxGrade] = useState('10,00')
    const [presenceMaxGrade, setPresenceMaxGrade] = useState('2,00')
    const [hasFinalExam, setHasFinalExam] = useState(false)

    const formatInitialGrade = (val: number | null | undefined, fallback: string) => {
        if (val === null || val === undefined) return fallback
        return val.toFixed(2).replace('.', ',')
    }

    const handleReset = () => {
        setStep(1)
        setName('')
        setBannerUrl('')
        setFileToUpload(null)
        setFilePreview(null)
        setIsDragging(false)
        setShowCancelConfirm(false)
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
        setDescription('')
        setStartDate('')
        setEndDate('')
        setMinGrade('6,00')
        setMaxGrade('10,00')
        setPresenceMaxGrade('2,00')
        setHasFinalExam(false)
        setLoading(false)
    }

    useEffect(() => {
        if (isOpen) {
            setStep(1)
            setShowCancelConfirm(false)
            setFileToUpload(null)
            setFilePreview(null)
            if (initialData) {
                setName(initialData.name || '')
                setBannerUrl(initialData.banner_url || '')
                setDescription(initialData.description || '')
                setStartDate(initialData.start_date || '')
                setEndDate(initialData.end_date || '')
                setMinGrade(formatInitialGrade(initialData.min_grade, '6,00'))
                setMaxGrade(formatInitialGrade(initialData.max_grade, '10,00'))
                setPresenceMaxGrade(formatInitialGrade(initialData.presence_max_grade, '2,00'))
                setHasFinalExam(!!initialData.has_final_exam)
            } else {
                handleReset()
            }
        }
    }, [isOpen, initialData])

    const handleClose = () => {
        handleReset()
        onClose()
    }

    const handleFile = (file: File) => {
        if (!file.type.startsWith('image/')) {
            alert('Por favor, selecione um arquivo de imagem (PNG, JPG ou WEBP).')
            return
        }
        setFileToUpload(file)
        const objectUrl = URL.createObjectURL(file)
        setFilePreview(objectUrl)
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            handleFile(file)
        }
    }

    const handleRemoveFile = () => {
        setFileToUpload(null)
        setFilePreview(null)
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const handleSubmit = async () => {
        if (!name.trim()) return
        setLoading(true)

        try {
            let finalBannerUrl: string | null = bannerUrl.trim() || null

            // Upload banner image to Supabase Storage if selected via file upload
            if (fileToUpload) {
                const ext = fileToUpload.name.split('.').pop() || 'png'
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`
                const filePath = `banners/${fileName}`

                const { error: uploadErr } = await supabase.storage
                    .from('materias')
                    .upload(filePath, fileToUpload, { upsert: true })

                if (uploadErr) {
                    // Fallback to avatars bucket if materias bucket is unconfigured
                    const { error: fallbackErr } = await supabase.storage
                        .from('avatars')
                        .upload(filePath, fileToUpload, { upsert: true })

                    if (fallbackErr) throw uploadErr

                    const { data: publicUrlData } = supabase.storage
                        .from('avatars')
                        .getPublicUrl(filePath)
                    finalBannerUrl = publicUrlData.publicUrl
                } else {
                    const { data: publicUrlData } = supabase.storage
                        .from('materias')
                        .getPublicUrl(filePath)
                    finalBannerUrl = publicUrlData.publicUrl
                }
            }

            const status = getMateriaStatus(startDate, endDate)
            const parsedMin = parseFloat(minGrade.replace(',', '.')) || 6.0
            const parsedMax = parseFloat(maxGrade.replace(',', '.')) || 10.0
            const parsedPresence = parseFloat(presenceMaxGrade.replace(',', '.')) || 2.0

            if (isEdit && initialData?.id) {
                const { error } = await supabase
                    .from('materias')
                    .update({
                        name: name.trim(),
                        banner_url: finalBannerUrl,
                        description: description.trim() || null,
                        start_date: startDate || null,
                        end_date: endDate || null,
                        min_grade: parsedMin,
                        max_grade: parsedMax,
                        presence_max_grade: parsedPresence,
                        has_final_exam: hasFinalExam,
                        status: status
                    })
                    .eq('id', initialData.id)

                if (error) throw error
            } else {
                const { error } = await supabase
                    .from('materias')
                    .insert({
                        name: name.trim(),
                        banner_url: finalBannerUrl,
                        description: description.trim() || null,
                        start_date: startDate || null,
                        end_date: endDate || null,
                        min_grade: parsedMin,
                        max_grade: parsedMax,
                        presence_max_grade: parsedPresence,
                        has_final_exam: hasFinalExam,
                        status: status,
                        is_active: true
                    })

                if (error) throw error
            }

            handleClose()
            if (onSuccess) onSuccess()
        } catch (err: any) {
            alert(err.message || (isEdit ? 'Erro ao salvar matéria' : 'Erro ao criar matéria'))
        } finally {
            setLoading(false)
        }
    }

    const formatGradeInput = (value: string): string => {
        let cleaned = value.replace(/\./g, ',')
        cleaned = cleaned.replace(/[^0-9,]/g, '')
        const commaIndex = cleaned.indexOf(',')
        if (commaIndex !== -1) {
            cleaned = cleaned.slice(0, commaIndex + 1) + cleaned.slice(commaIndex + 1).replace(/,/g, '')
        }

        const parts = cleaned.split(',')
        let integerPart = parts[0].slice(0, 4)

        if (parts.length === 1) {
            return integerPart
        }

        let decimalPart = parts[1]
        let nonZeroCount = 0
        for (const char of integerPart) {
            if (char >= '1' && char <= '9') {
                nonZeroCount++
            }
        }

        let allowedDecimal = ''
        let charsAfterTwoNonZero = 0

        for (let i = 0; i < decimalPart.length; i++) {
            const char = decimalPart[i]
            const isNonZero = char >= '1' && char <= '9'

            if (nonZeroCount >= 2) {
                if (charsAfterTwoNonZero >= 2) {
                    break
                }
                charsAfterTwoNonZero++
                allowedDecimal += char
            } else {
                if (isNonZero) {
                    nonZeroCount++
                    allowedDecimal += char
                } else {
                    if (allowedDecimal.length < 4) {
                        allowedDecimal += char
                    } else {
                        break
                    }
                }
            }
        }

        return `${integerPart},${allowedDecimal}`
    }

    const isUploadMode = !!filePreview
    const isUrlMode = !isUploadMode && bannerUrl.trim() !== ''
    const isInitialMode = !isUploadMode && !isUrlMode

    return (
        <StepModal
            isOpen={isOpen}
            onClose={handleClose}
            onCloseClick={() => setShowCancelConfirm(true)}
            onBackStep={() => setStep(1)}
            outsideCloseClick={false}
            currentStep={step}
            totalSteps={2}
            mobileFooter={
                step === 1 ? (
                    <button
                        type="button"
                        onClick={() => {
                            if (name.trim()) setStep(2)
                        }}
                        disabled={!name.trim()}
                        className="w-full py-3.5 px-4 rounded-[12px] bg-[#38302A] text-white font-semibold text-[14px] hover:bg-brown-400 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
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
                        {loading ? 'Salvando...' : (isEdit ? 'Salvar Alterações' : 'Criar Matéria')}
                    </button>
                )
            }
        >
            {step === 1 ? (
                <div className="flex flex-col gap-5">
                    {/* Nome da Matéria */}
                    <div>
                        <label className="text-[#3A332C] text-[11px] font-bold tracking-wider uppercase mb-2 block">
                            NOME DA MATÉRIA <span className="text-danger">*</span>
                        </label>
                        <Input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Digite o nome da matéria..."
                            icon={
                                <Image
                                    src="/icons/matery/book-materia-icon.svg"
                                    alt="Matéria"
                                    width={18}
                                    height={18}
                                />
                            }
                            containerClassName="bg-[#FFF8F6] border-none h-[48px]"
                            containerStyle={{ borderRadius: '12px' }}
                        />
                    </div>

                    {/* URL do Banner / Upload */}
                    <div>
                        <label className="text-[#3A332C] text-[11px] font-semibold tracking-wider mb-2 block uppercase">
                            URL DO BANNER <span className="text-[#8C7A6B] font-normal lowercase">(opcional / upload direto)</span>
                        </label>

                        {/* Hidden Input for File Upload */}
                        <input
                            type="file"
                            ref={fileInputRef}
                            accept="image/*"
                            className="hidden"
                            onChange={handleFileSelect}
                        />

                        {/* Drop Zone / Card */}
                        <div
                            onDragOver={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                if (isInitialMode) setIsDragging(true)
                            }}
                            onDragLeave={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setIsDragging(false)
                            }}
                            onDrop={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setIsDragging(false)
                                if (isInitialMode) {
                                    const droppedFile = e.dataTransfer.files?.[0]
                                    if (droppedFile) handleFile(droppedFile)
                                }
                            }}
                            onClick={() => {
                                if (isInitialMode) {
                                    fileInputRef.current?.click()
                                }
                            }}
                            className={`border-2 border-dashed border-[#EDE6DE] bg-[#FFF8F6] rounded-[16px] overflow-hidden relative transition-colors ${
                                isInitialMode ? 'cursor-pointer hover:bg-[#FDF3EE]' : ''
                            } ${isDragging ? 'border-[#38302A] bg-[#FDF3EE]' : ''} ${
                                isUploadMode || isUrlMode ? 'h-[140px]' : 'p-5 text-center flex flex-col items-center justify-center mb-3'
                            }`}
                        >
                            {/* Upload Mode Preview with Overlay */}
                            {isUploadMode && (
                                <div className="relative w-full h-full group">
                                    <img
                                        src={filePreview!}
                                        alt="Banner Preview"
                                        className="w-full h-full object-cover rounded-[14px]"
                                    />
                                    {/* Overlay with edit and delete buttons */}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-3">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                fileInputRef.current?.click()
                                            }}
                                            className="w-10 h-10 rounded-full bg-white text-[#3A332C] hover:bg-[#FFF8F6] flex items-center justify-center shadow-md transition-transform hover:scale-105 cursor-pointer"
                                            title="Alterar imagem"
                                        >
                                            <Pencil size={18} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleRemoveFile()
                                            }}
                                            className="w-10 h-10 rounded-full bg-white text-danger hover:bg-[#FEE2E2] flex items-center justify-center shadow-md transition-transform hover:scale-105 cursor-pointer"
                                            title="Remover imagem"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* URL Mode Preview */}
                            {isUrlMode && (
                                <div className="w-full h-full relative group">
                                    <img
                                        src={bannerUrl}
                                        alt="Banner URL Preview"
                                        className="w-full h-full object-cover rounded-[14px]"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none'
                                        }}
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-3">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setBannerUrl('')
                                            }}
                                            className="w-10 h-10 rounded-full bg-white text-danger hover:bg-[#FEE2E2] flex items-center justify-center shadow-md transition-transform hover:scale-105 cursor-pointer"
                                            title="Remover link do banner"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Initial State (Placeholder) */}
                            {isInitialMode && (
                                <>
                                    <div className="w-10 h-10 bg-white border border-[#EDE6DE] rounded-[4px] flex items-center justify-center mb-2 shadow-xs">
                                        <Image
                                            src="/icons/matery/picture-icon.svg"
                                            alt="Carregar Banner"
                                            width={20}
                                            height={20}
                                        />
                                    </div>
                                    <span className="text-[#3A332C] text-[13px] font-semibold mb-0.5">
                                        Clique para carregar o banner
                                    </span>
                                    <span className="text-[#8C7A6B] text-[11px]">
                                        PNG, JPG ou WEBP até 5MB
                                    </span>
                                </>
                            )}
                        </div>

                        {/* URL Input */}
                        {!isUploadMode && (
                            <Input
                                type="text"
                                value={bannerUrl}
                                onChange={(e) => setBannerUrl(e.target.value)}
                                placeholder="Ou insira um link direto de imagem (https://...)"
                                containerClassName="bg-[#FFF8F6] border-none h-[44px] mt-3"
                                containerStyle={{ borderRadius: '12px' }}
                                textSize="caption"
                            />
                        )}
                    </div>

                    {/* Descrição */}
                    <div>
                        <label className="text-[#3A332C] text-[11px] font-semibold tracking-wider mb-2 block">
                            DESCRIÇÃO DA MATÉRIA <span className="text-[#8C7A6B] font-normal">(Opcional)</span>
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Uma breve descrição sobre o que será tratado nesta matéria"
                            className="w-full bg-[#FFF8F6] rounded-[16px] p-4 text-[#3A332C] placeholder:text-[#8C7A6B] text-[13px] outline-none border border-transparent focus:border-[#DFD8CE] min-h-[90px] resize-none"
                        />
                    </div>

                    {/* Footer Buttons Step 1 (Desktop) */}
                    <div className="hidden md:flex items-center gap-3 mt-2">
                        <button
                            type="button"
                            onClick={() => setShowCancelConfirm(true)}
                            className="flex-1 py-3 px-4 rounded-[10px] border border-[#DFD8CE] bg-white text-[#4D453E] font-semibold text-[14px] hover:bg-[#F5F0EB] transition-colors cursor-pointer"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                if (name.trim()) setStep(2)
                            }}
                            disabled={!name.trim()}
                            className="flex-1 py-3 px-4 rounded-[10px] bg-[#38302A] text-white font-semibold text-[14px] hover:bg-brown-400 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                        >
                            Continuar →
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col gap-5">
                    {/* Data de Início */}
                    <div>
                        <label className="text-[#3A332C] text-[11px] font-bold tracking-wider uppercase mb-2 block">
                            DATA DE INÍCIO <span className="text-danger">*</span>
                        </label>
                        <DatePicker
                            value={startDate}
                            onChange={(newStartDate) => {
                                setStartDate(newStartDate)
                                if (endDate && newStartDate && endDate < newStartDate) {
                                    setEndDate('')
                                }
                            }}
                            placeholder="dd/mm/aaaa"
                        />
                    </div>

                    {/* Data de Término */}
                    <div>
                        <label className="text-[#3A332C] text-[11px] font-bold tracking-wider uppercase mb-2 block">
                            DATA DE TÉRMINO <span className="text-danger">*</span>
                        </label>
                        <DatePicker
                            value={endDate}
                            onChange={setEndDate}
                            placeholder="dd/mm/aaaa"
                            minDate={startDate}
                        />
                    </div>

                    {/* Grid Notas */}
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="text-[#3A332C] text-[10px] font-bold tracking-wider uppercase mb-2 block text-center">
                                NOTA MÍNIMA
                            </label>
                            <input
                                type="text"
                                value={minGrade}
                                onChange={(e) => setMinGrade(formatGradeInput(e.target.value))}
                                className="w-full bg-[#FFF8F6] rounded-[12px] h-[48px] px-2 text-[#3A332C] font-bold text-center outline-none border border-transparent focus:border-[#DFD8CE] text-[14px]"
                            />
                        </div>
                        <div>
                            <label className="text-[#3A332C] text-[10px] font-bold tracking-wider uppercase mb-2 block text-center">
                                NOTA MÁXIMA
                            </label>
                            <input
                                type="text"
                                value={maxGrade}
                                onChange={(e) => setMaxGrade(formatGradeInput(e.target.value))}
                                className="w-full bg-[#FFF8F6] rounded-[12px] h-[48px] px-2 text-[#3A332C] font-bold text-center outline-none border border-transparent focus:border-[#DFD8CE] text-[14px]"
                            />
                        </div>
                        <div>
                            <label className="text-[#3A332C] text-[10px] font-bold tracking-wider uppercase mb-2 block text-center">
                                NOTA PRESENÇA
                            </label>
                            <input
                                type="text"
                                value={presenceMaxGrade}
                                onChange={(e) => setPresenceMaxGrade(formatGradeInput(e.target.value))}
                                className="w-full bg-[#FFF8F6] rounded-[12px] h-[48px] px-2 text-[#3A332C] font-bold text-center outline-none border border-transparent focus:border-[#DFD8CE] text-[14px]"
                            />
                        </div>
                    </div>

                    {/* Checkbox Prova Final */}
                    <div className="border-2 border-dashed border-[#EDE6DE] bg-[#FFF8F6] rounded-[16px] p-4 flex items-center gap-3 select-none">
                        <Checkbox
                            checked={hasFinalExam}
                            onChange={(e) => setHasFinalExam(e.target.checked)}
                            label={<span className="text-[#3A332C] text-[14px] font-bold">Terá prova final?</span>}
                        />
                    </div>

                    {/* Footer Buttons Step 2 (Desktop) */}
                    <div className="hidden md:flex items-center gap-3 mt-2">
                        <button
                            type="button"
                            onClick={() => setStep(1)}
                            className="flex-1 py-3 px-4 rounded-[10px] border border-[#DFD8CE] bg-white text-[#4D453E] font-semibold text-[14px] hover:bg-[#F5F0EB] transition-colors cursor-pointer"
                        >
                            Voltar
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={loading}
                            className="flex-1 py-3 px-4 rounded-[10px] bg-[#38302A] text-white font-semibold text-[14px] hover:bg-brown-400 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                        >
                            {loading ? (isEdit ? 'Salvando...' : 'Criando...') : (isEdit ? 'Salvar Alterações' : 'Criar Matéria')}
                        </button>
                    </div>
                </div>
            )}

            {/* Modal de Confirmação de Cancelamento */}
            <Modal
                isOpen={showCancelConfirm}
                onClose={() => setShowCancelConfirm(false)}
                outsideCloseClick={false}
                className="max-w-[420px]"
            >
                <div className="flex flex-col items-center text-center">
                    <h3 className="text-[#3A332C] text-[16px] font-bold mb-6">
                        {isEdit
                            ? 'Certeza que deseja cancelar a edição da matéria?'
                            : 'Certeza que cancelar a operação de criar uma nova matéria?'}
                    </h3>
                    <div className="flex items-center gap-3 w-full">
                        <button
                            type="button"
                            onClick={() => setShowCancelConfirm(false)}
                            className="flex-1 py-3 px-4 rounded-[10px] border border-[#DFD8CE] bg-white text-[#4D453E] font-semibold text-[14px] hover:bg-[#F5F0EB] transition-colors cursor-pointer"
                        >
                            Não, continuar
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setShowCancelConfirm(false)
                                handleClose()
                            }}
                            className="flex-1 py-3 px-4 rounded-[10px] bg-[#38302A] text-white font-semibold text-[14px] hover:bg-brown-400 transition-colors cursor-pointer"
                        >
                            Sim, cancelar
                        </button>
                    </div>
                </div>
            </Modal>
        </StepModal>
    )
}

export default CreateOrEditMaterialModal
