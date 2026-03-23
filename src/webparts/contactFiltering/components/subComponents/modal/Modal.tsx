import * as React from 'react';
import { useEffect } from 'react';
import styles from './Modal.module.scss';
import { DismissFilled } from '@fluentui/react-icons';

export interface IModalProps {
    title?: string;
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    width?: 'small' | 'medium' | 'mediumLarge' | 'large';
}


const Modal: React.FC<IModalProps> = (props) => {
    
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent): void => {
            if (event.key === 'Escape') {
                props.onClose();
            }
        };

        if (props.isOpen) {
            document.addEventListener('keydown', handleKeyDown, true);
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [props.isOpen, props.onClose]);
    
    if (!props.isOpen) {
        return null;
    } 

    const handleContentClick = (event: React.MouseEvent<HTMLDivElement>): void => {
        event.stopPropagation();
    };

    const contentClasses = [
        styles.content,
        props.width ? styles[props.width] : ''
    ].join(' ');

    return (
        <div className={styles.overlay} onClick={props.onClose}>
            <div className={contentClasses} onClick={handleContentClick}>
                <div className={styles.header}>
                    {props.title ? <h2 className={styles.title}>{props.title}</h2> : null}
                    <button className={styles.closeButton} onClick={props.onClose}>
                        <DismissFilled />
                    </button>
                </div>

                {props.children}
            </div>
        </div>
    );
};

export default Modal;