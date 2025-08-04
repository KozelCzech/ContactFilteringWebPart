import * as React from 'react';
import styles from './Paginator.module.scss';

export interface IPaginatorProps {
    children: React.ReactNode;
    hasNext: boolean;
    hasPrevious: boolean;
    currentPageNumber: number;
    handleNext: () => void;
    handlePrevious: () => void;
}

const Paginator: React.FC<IPaginatorProps> = ({ children, hasNext, hasPrevious, currentPageNumber, handleNext, handlePrevious}) => {


    return (
        <div>
            {children}
            
            <div className={styles.paginator}>
                <button onClick={handlePrevious} disabled={!hasPrevious}>Previous</button>
                <button disabled>{currentPageNumber + 1}</button>
                <button onClick={handleNext} disabled={!hasNext}>Next</button>
            </div>
        </div>
    );
}

export default Paginator;