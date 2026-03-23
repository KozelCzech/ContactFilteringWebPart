import { ConstrainMode, DetailsList, DetailsListLayoutMode, IColumn, IIconProps, IconButton, PrimaryButton, SelectionMode, Icon, Spinner, SpinnerSize } from '@fluentui/react';
import { SPFI } from '@pnp/sp';
import jsPDF from 'jspdf';
import autoTable, { UserOptions } from 'jspdf-autotable';
import * as React from 'react';
import { useEffect, useState } from 'react';
import styles from './FinancialStatements.module.scss';
import { IAbsence, IAbsenceType } from '../AbsenceInterfaces';
import { fetchAbsenceTypes, fetchAllAbsences } from '../../../../../utils/ptoUtils';
import { IContact } from '../../../models/IContact';
import { fetchDepartmentByUserId, fetchUserById, IDepartment,  } from '../../../../../utils/userUtils';
import { notoSansRegularBase64 } from '../../../../../utils/customFonts';



// Extend the jsPDF interface to include the autoTable method from the plugin.
declare module 'jspdf' {
    interface jsPDF {
        autoTable: (options: UserOptions) => jsPDF;
    }
}

interface FinancialStatementsProps {
    sp: SPFI
}

interface IFinancialStatementItem {
    key: number;
    department: string;
    employeeName: string;
    from: Date;
    to: Date;
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
    const [ isLoading, setIsLoading ] = useState<boolean>(false);


    // Mock data for demonstration
    
    
    
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
            { key: 'department', name: 'Oddělení', fieldName: 'department', minWidth: 100, isResizable: true },
            { key: 'employeeName', name: 'Jméno', fieldName: 'employeeName', minWidth: 150, isResizable: true },
            { 
                key: 'from', 
                name: 'Od', 
                fieldName: 'from', 
                minWidth: 80, 
                isResizable: true,
                onRender: (item: IFinancialStatementItem) => item.from.toLocaleDateString() // Format Date to string
            },
            { 
                key: 'to', 
                name: 'Do', 
                fieldName: 'to', 
                minWidth: 80, 
                isResizable: true,
                onRender: (item: IFinancialStatementItem) => item.to.toLocaleDateString() // Format Date to string
            },
            { key: 'totalHours', name: 'Celkem hodin', fieldName: 'totalHours', minWidth: 100, isResizable: true },
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
                let currentMonthHours = 0;
                if (absence.HoursUsed > 0) {
                    if (modifiedStart === absenceStart && modifiedEnd === absenceEnd){
                        currentMonthHours = absence.HoursUsed
                    }
                    else if (modifiedStart === absenceStart && modifiedEnd !== absenceEnd){
                        currentMonthHours = absence.FirstMonth || absence.HoursUsed
                    }
                    else if (modifiedEnd === absenceEnd && modifiedStart !== absenceStart){
                        currentMonthHours = absence.SecondMonth || absence.HoursUsed
                    }
                }
                
               
                const modifiedAbsence: IAbsence = {
                    ...absence,
                    HoursUsed: currentMonthHours,
                    From: modifiedStart,
                    To: modifiedEnd
                }
                currentMonthAbsences.push(modifiedAbsence);
            }
        });



        const rowPromises = currentMonthAbsences.map(async (absence) => {
            try {
                const employee: IContact = await fetchUserById(sp, absence.Employee.Id);
                const department: IDepartment = await fetchDepartmentByUserId(sp, employee.Id) || { Id: 0, Title: '' , Leader: {Id: 0, Title: ''}, Location: '', UniqueCode: 0};

                const row: IFinancialStatementItem = {
                    key: absence.Id,
                    department: department?.Title || "Nezadáno",
                    employeeName: `${employee.FirstName || ''} ${employee.LastName || ''}`,
                    from: absence.From,
                    to: absence.To,
                    totalHours: absence.HoursUsed,
                    absenceTypes: { [absence.AbsenceType.Title]: true }
                };
                return row;
            } catch (error) {
                console.error("Error processing absence row:", error);
                return null; // Return null for failed rows
            }
        });

        const fsRows = (await Promise.all(rowPromises)).filter(item => item !== null) as IFinancialStatementItem[];
        
        setItems(fsRows);

    }

    const handleDownloadPdf = (): void => {
        const doc = new jsPDF();

        // --- Font Registration ---
        // 1. Add the font file to the virtual file system of the PDF document.
        doc.addFileToVFS('NotoSans-Regular.ttf', notoSansRegularBase64);
        // 2. Add the font to the document, linking it to the file.
        doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
        // 3. Set this as the active font for the document.
        doc.setFont('NotoSans');

        const monthName = new Date(selectedYear, selectedMonth).toLocaleString('cs-CZ', { month: 'long' });
        const title = `Měsíční výkazy - ${monthName} ${selectedYear}`;

        doc.text(title, 14, 15);
 
        // Filter out columns that are purely for UI rendering (like the checkmark)
        // and prepare headers for the PDF table.
        const head = columns.map(col => col.name);

        // Prepare the body of the table from the 'items' state.
        const body = items.map(item => {
            return columns.map(col => {
                switch (col.key) {
                    case 'from':
                        return item.from.toLocaleDateString();
                    case 'to':
                        return item.to.toLocaleDateString();
                    case 'department':
                        return item.department;
                    case 'employeeName':
                        return item.employeeName;
                    case 'totalHours':
                        return item.totalHours;
                    default:
                    {
                        // This default case now correctly handles only the dynamic absence type columns
                        // The key is like 'AbsenceTypeTitle' and fieldName is 'absenceTypes.AbsenceTypeTitle'
                        const absenceTypeName: string = col.name;
                        // Using a heavy checkmark which has slightly better font support in some cases.
                        // The font used in the PDF must support this character.
                        return item.absenceTypes[absenceTypeName] ? '✔' : '';
                    }
                }
            });
        });

    autoTable(doc, {
        head: [head],
        body: body,
        startY: 20,
        styles: {
            font: 'NotoSans', // Use the custom font for the table body
            cellPadding: 2, // Add some padding
            fontSize: 6,
        },
        headStyles: { font: 'NotoSans', fillColor: [22, 160, 133], fontStyle: 'normal' },
        alternateRowStyles: { fillColor: [240, 240, 240] },
            // 2. The Hook: Switch font ONLY for the checkmark cells
        
        willDrawCell: (data) => {
            if (data.section === 'body' && data.cell.raw === '✔') {
                doc.setFont('ZapfDingbats'); // Switch to symbol font
                data.cell.text = ['4'];      // '4' maps to the heavy checkmark icon
                    
                // Optional: Center it nicely
                data.cell.styles.halign = 'center'; 
            }
        },

        // 3. Reset the font immediately after so the next cell (Department, etc.)
        // doesn't try to render in ZapfDingbats (which would look like garbage).
        didDrawCell: (data) => {
             // Always reset to your main font
            doc.setFont('NotoSans');
        }
    });


        
        doc.save(`MesicniVykazy-${monthName}-${selectedYear}.pdf`);
    };


    useEffect(() => {
        const loadData = async (): Promise<void> => {
            setIsLoading(true);
            try {
                await setFSRows();
            } catch (error) {
                console.error("Error fetching financial statement data:", error);
            }
            setIsLoading(false);
        }
        loadData().catch(error => {
            console.error("Error in loadData:", error);
        });
    }, [selectedMonth, selectedYear, sp]); // Added sp to dependency array for correctness

    return (
        <div>
            <div className={styles.header}>
                <div /> {/* Empty div to balance the flex layout */}
                <div className={styles.monthSelector}>
                    <IconButton iconProps={leftNavigationIcon} onClick={setPreviousMonth} aria-label="Předchozí měsíc" title="Předchozí měsíc" />
                    <h3>{new Date(selectedYear, selectedMonth).toLocaleString('cs-CZ', { month: 'long' })} - {selectedYear}</h3>
                    <IconButton iconProps={rightNavigationIcon} onClick={setNextMonth} disabled={isNextMonthDisabled} aria-label="Příští měsíc" title="Příští měsíc" />
                </div>
                <PrimaryButton onClick={handleDownloadPdf} disabled={isLoading || items.length === 0}>Stáhnout PDF</PrimaryButton>
            </div>
            {isLoading ? (
                <Spinner size={SpinnerSize.large} label="Načítám měsíční výkazy..." />
            ) : (
                <DetailsList
                    items={items}
                    columns={columns}
                    className={styles.statementDetailsList}
                    setKey="set"
                    layoutMode={DetailsListLayoutMode.justified}
                    constrainMode={ConstrainMode.horizontalConstrained}
                    selectionMode={SelectionMode.none}
                    isHeaderVisible={true}
                    compact={true}
                />
            )}

            {/* Month selector and PDF download button*/}
            {/*grid displaying info rows contain: */}
            {/*Department | employee name | From | To | PTO used up | AbsenceTypes with FinancialStatement = true*/}
            {/*if an absence has a From or To in a different month, simply cut it off with either 1st or 31st/30th*/}
            {/*Cut off vacation starts picks up on the next month from the cutoff date*/}
        </div>
    );
}

export default FinancialStatements;