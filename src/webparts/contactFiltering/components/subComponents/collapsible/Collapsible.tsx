import * as React from 'react';
import styles from './Collapsible.module.scss';
import { useState } from 'react';


export interface ICollapsibleProps {
    title: string;
    children: React.ReactNode;
}


const Collapsible: React.FC<ICollapsibleProps> = (props) => {
    const [isOpen, setIsOpen] = useState(false);

    const toggleCollapse = (): void => {
        setIsOpen(!isOpen);
    };

    return (
        <div className={styles.collapsible}>
            <button className={styles.toggleButton} onClick={toggleCollapse}>
                {props.title}
                <span className={`${styles.icon} ${isOpen ? styles.open : ''}`}>▼</span>
            </button>
            <div className={`${styles.content} ${isOpen ? styles.contentOpen : ''}`}>
                <div className={styles.contentInner}>
                    {props.children}
                </div>
            </div>
        </div>
    );
};

export default Collapsible;