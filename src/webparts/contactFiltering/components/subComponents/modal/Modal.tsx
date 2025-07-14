import * as React from 'react';
import styles from './Modal.module.scss';

export interface IModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
}


const Modal: React.FC<IModalProps> = (props) => {
    
    if (!props.isOpen) {
        return null;
    } 

    const handleContentClick = (event: React.MouseEvent<HTMLDivElement>): void => {
        event.stopPropagation();
    };

    return (
        <div className={styles.overlay} onClick={props.onClose}>
            <div className={styles.content} onClick={handleContentClick}>
                <button className={styles.closeButton} onClick={props.onClose}>
                    &times;
                </button>

                {props.children}
            </div>
        </div>
    );
};

export default Modal;