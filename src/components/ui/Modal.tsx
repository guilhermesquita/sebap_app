import React, { ReactNode } from 'react'
import { X, AlertCircle, CheckCircle, Info } from 'lucide-react'
import styles from './modal.module.css'

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    title?: string
    children: ReactNode
    type?: 'alert' | 'success' | 'info' | 'default'
}

export const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    type = 'default'
}) => {
    if (!isOpen) return null

    const getIcon = () => {
        switch (type) {
            case 'alert': return <AlertCircle className={styles.alertIcon} size={24} />
            case 'success': return <CheckCircle className={styles.successIcon} size={24} />
            case 'info': return <Info className={styles.infoIcon} size={24} />
            default: return null
        }
    }

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={`${styles.modal} ${styles[type]}`} onClick={e => e.stopPropagation()}>
                <header className={styles.header}>
                    <div className={styles.titleWrapper}>
                        {getIcon()}
                        {title && <h3 className={styles.title}>{title}</h3>}
                    </div>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <X size={20} />
                    </button>
                </header>
                <div className={styles.body}>
                    {children}
                </div>
            </div>
        </div>
    )
}
