import { ConstrainMode, DetailsList, DetailsListLayoutMode, IColumn, IIconProps, IconButton, PrimaryButton, SelectionMode, Icon } from '@fluentui/react';
import { SPFI } from '@pnp/sp';
import * as React from 'react';
import { useEffect, useState } from 'react';
import styles from './FinancialStatements.module.scss';
import { IAbsence, IAbsenceType } from '../AbsenceInterfaces';
import { fetchAbsenceTypes, fetchAllAbsences } from '../../../../../utils/ptoUtils';




interface FinancialStatementsProps {
    sp: SPFI
}

interface IFinancialStatementItem {
    key: number;
    department: string;
    employeeName: string;
    from: string;
    to: string;
    totalHours: number;
    absenceTypes: { [key: string]: boolean }; // To hold hours for dynamic absence types
}



const FinancialStatements: React.FC<FinancialStatementsProps> = (props) => {
    const { sp } = props;
    const [ selectedMonth, setSelectedMonth ] = useState(new Date().getMonth());
    const [ selectedYear, setSelectedYear ] = useState(new Date().getFullYear());
    const [ items, setItems] = useState<IFinancialStatementItem[]>([]); // This will hold the rows for the table
    const [ columns, setColumns] = useState<IColumn[]>([]); // This will hold the column definitions
    const [ fetchedAbsenceTypes, setFetchedAbsenceTypes ] = useState<IAbsenceType[]>([]);


    // Mock data for demonstration
    const mockItems: IFinancialStatementItem[] = [
        { key: 1, department: 'Sales', employeeName: 'John Doe', from: '01/11/2023', to: '05/11/2023', totalHours: 40, absenceTypes: { 'Vacation': true } },
        { key: 2, department: 'Engineering', employeeName: 'Jane Smith', from: '10/11/2023', to: '11/11/2023', totalHours: 16, absenceTypes: { 'Vacation': true } },
        { key: 3, department: 'Marketing', employeeName: 'Peter Jones', from: '20/11/2023', to: '24/11/2023', totalHours: 40, absenceTypes: { 'Business Trip': true } },
    ];



    useEffect(() => {
        fetchAbsenceTypes(sp).then(types => {
            setFetchedAbsenceTypes(types); // Store fetched types in state
        }).catch(error => {
            console.error("Error fetching absence types:", error);
        });
    }, [sp]); // Re-run if 'sp' object changes

    useEffect(() => {
        
        // Base columns that are always present
        const baseColumns: IColumn[] = [
            { key: 'department', name: 'Department', fieldName: 'department', minWidth: 100, isResizable: true },
            { key: 'employeeName', name: 'Employee Name', fieldName: 'employeeName', minWidth: 150, isResizable: true },
            { key: 'from', name: 'From', fieldName: 'from', minWidth: 80, isResizable: true },
            { key: 'to', name: 'To', fieldName: 'to', minWidth: 80, isResizable: true },
            { key: 'totalHours', name: 'Total Hours', fieldName: 'totalHours', minWidth: 100, isResizable: true },
        ];

        // Dynamically create columns for absence types where financialStatement is true
        const dynamicColumns: IColumn[] = fetchedAbsenceTypes // Use the state variable here
            .filter(type => type.FinancialStatement)
            .map(type => ({
                key: type.Title.replace(' ', ''), // Create a key from the title
                name: type.Title,
                fieldName: `absenceTypes.${type.Title}`, // This will be used to get the value
                minWidth: 80,
                isResizable: true,
                onRender: (item: IFinancialStatementItem) => {
                    const hasAbsenceType = item.absenceTypes[type.Title];
                    return hasAbsenceType 
                        ? <Icon iconName="CheckMark" styles={{ root: { color: 'green' } }} /> 
                        : null;
                }
            }));

        setColumns([...baseColumns, ...dynamicColumns]);
    }, [fetchedAbsenceTypes]); // Re-run this effect when fetchedAbsenceTypes changes

    const leftNavigationIcon: IIconProps = { iconName: 'ChevronLeft' };
    const rightNavigationIcon: IIconProps = { iconName: 'ChevronRight' };

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    // Determine if the "Next" button should be disabled (or hidden)
    // It should be hidden if the selected month/year is the current month/year or in the future
    const isNextMonthDisabled = selectedYear > currentYear || (selectedYear === currentYear && selectedMonth >= currentMonth);

    const setNextMonth = (): void => {
        if (selectedMonth === 11) {
            setSelectedYear(selectedYear + 1);
            setSelectedMonth(0);
        }
        else {
            setSelectedMonth(selectedMonth + 1);
        }
    }

    const setPreviousMonth = (): void => {
        if (selectedMonth === 0) {
            setSelectedYear(selectedYear - 1);
            setSelectedMonth(11);
        }
        else{
            setSelectedMonth(selectedMonth - 1);
        }
    }


    const setFSRows = async (): Promise<void> => {
        const allAbsences: IAbsence[] = await fetchAllAbsences(sp);
        
        const startOfMonth = new Date(selectedYear, selectedMonth, 1);
        const endOfMonth = new Date(selectedYear, selectedMonth + 1, 0);
        endOfMonth.setHours(23, 59, 59, 999); // Ensure it's the very end of the last day of the month
        
        const currentMonthAbsences: IAbsence[] = [];

        allAbsences.forEach(absence => {
            const absenceStart = new Date(absence.From);
            const absenceEnd = new Date(absence.To);
            
            // Check if the absence period overlaps with the selected month
            if (absenceStart <= endOfMonth && absenceEnd >= startOfMonth) {
                // Clip the start date to the beginning of the month if it's before
                const modifiedStart = absenceStart < startOfMonth ? startOfMonth : absenceStart;
                // Clip the end date to the end of the month if it's after
                const modifiedEnd = absenceEnd > endOfMonth ? endOfMonth : absenceEnd;
               
                const modifiedAbsence: IAbsence = {
                    ...absence,
                    From: modifiedStart,
                    To: modifiedEnd
                }
                currentMonthAbsences.push(modifiedAbsence);
            }
        });

        console.log("Current months absences: ", currentMonthAbsences)

    }


    useEffect(() => {
        // In a real scenario, you would fetch data based on selectedMonth and selectedYear
        console.log(`Fetching data for ${selectedMonth + 1}/${selectedYear}`);
        setFSRows().catch(error => {
            console.error("Error fetching data:", error);
        });

        setItems(mockItems);
    }, [selectedMonth, selectedYear]);

    return (
        <div>
            <div className={styles.header}>
                <div /> {/* Empty div to balance the flex layout */}
                <div className={styles.monthSelector}>
                    <IconButton iconProps={leftNavigationIcon} onClick={setPreviousMonth} aria-label="Previous month" title="Previous month" />
                    <h3>{new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'long' })} - {selectedYear}</h3>
                    <IconButton iconProps={rightNavigationIcon} onClick={setNextMonth} disabled={isNextMonthDisabled} aria-label="Next month" title="Next month" />
                </div>
                <PrimaryButton>Download PDF</PrimaryButton>
            </div>
            <DetailsList
                items={items}
                columns={columns}
                setKey="set"
                layoutMode={DetailsListLayoutMode.justified}
                constrainMode={ConstrainMode.horizontalConstrained}
                selectionMode={SelectionMode.none}
                isHeaderVisible={true}
                compact={true}
            />
            {/* Month selector and PDF download button*/}
            {/*grid displaying info rows contain: */}
            {/*Department | employee name | From | To | PTO used up | AbsenceTypes with FinancialStatement = true*/}
            {/*if an absence has a From or To in a different month, simply cut it off with either 1st or 31st/30th*/}
            {/*Cut off vacation starts picks up on the next month from the cutoff date*/}
        </div>
    );
}

export default FinancialStatements;