'use client'

import React, { useRef } from 'react'
import { Camera, Pencil, Trash2 } from 'lucide-react'

interface ProfileAvatarProps {
    imageUrl?: string | null
    name?: string
    onFileSelect: (file: File) => void
    onRemoveImage?: () => void
    className?: string
}

export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
    imageUrl,
    name = 'U',
    onFileSelect,
    onRemoveImage,
    className = ''
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            onFileSelect(file)
        }
    }

    const hasImage = !!imageUrl

    return (
        <div className={`relative inline-block flex-shrink-0 group ${className}`}>
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleChange}
            />

            {/* Inner Avatar Circle with overflow-hidden */}
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-white bg-[#EAE3D9] shadow-sm overflow-hidden flex items-center justify-center">
                {hasImage ? (
                    <>
                        <img src={imageUrl!} alt={name} className="w-full h-full object-cover" />
                        {/* Hover Overlay with Edit and Delete Buttons */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    fileInputRef.current?.click()
                                }}
                                className="w-9 h-9 rounded-full bg-white text-[#3A332C] hover:bg-[#FFF8F6] flex items-center justify-center shadow-md transition-transform hover:scale-105 cursor-pointer"
                                title="Alterar imagem"
                            >
                                <Pencil size={16} />
                            </button>
                            {onRemoveImage && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onRemoveImage()
                                    }}
                                    className="w-9 h-9 rounded-full bg-white text-danger hover:bg-[#FEE2E2] flex items-center justify-center shadow-md transition-transform hover:scale-105 cursor-pointer"
                                    title="Remover imagem"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                    </>
                ) : (
                    <span className="text-[#3A332C] font-extrabold text-[32px] sm:text-[36px] select-none">
                        {name.charAt(0).toUpperCase()}
                    </span>
                )}
            </div>

            {/* Camera Badge Button (outside overflow-hidden, floats cleanly at bottom-right corner) */}
            {!hasImage && (
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#38302A] border-2 border-white flex items-center justify-center text-white hover:bg-[#55402A] transition-transform hover:scale-105 active:scale-95 cursor-pointer shadow-md z-10"
                    title="Carregar foto de perfil"
                >
                    <Camera size={15} />
                </button>
            )}
        </div>
    )
}

export default ProfileAvatar
