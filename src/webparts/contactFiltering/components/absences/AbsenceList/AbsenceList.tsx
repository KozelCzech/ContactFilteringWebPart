import * as React from 'react';
import styles from './AbsenceList.module.scss';
import { SPFI } from '@pnp/sp';
import { useEffect } from 'react';
import { IAbsence, IAbsenceType } from '../AbsenceInterfaces';
import { Checkbox, ConstrainMode, DetailsList, DetailsListLayoutMode, Dropdown, IColumn, IconButton, IDropdownOption, PivotItem, PrimaryButton, SelectionMode, TextField } from '@fluentui/react';
import { CheckmarkFilled, DismissFilled } from '@fluentui/react-icons';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { formatDate, getCzechHolidaysCallendarEvents } from '../../../../../utils/dateUtils';
import { IContact } from '../../../models/IContact';
import TabsView from '../../subComponents/tabsView/tabsView';
import { fetchAllDepartments, fetchEmployeeIdsByDepartment } from '../../../../../services/userServices';
import { fetchAbsencesWithFilter, fetchAbsenceTypes as fetchAbsenceTypesService } from '../../../../../services/absenceServices';
import { fetchContactItems } from '../../../../../services/contactServices';

import dayGridPlugin from '@fullcalendar/daygrid';
import cs from '@fullcalendar/core/locales/cs';


export interface AbsenceListProps {
    sp: SPFI;
    requestModalOpen: boolean;
    approveModalOpen: boolean;
    showHistory?: boolean;
}


export interface ICallendarEvent {
    title?: string;
    start: string;
    end?: string; // Make end optional as per FullCalendar's EventObject
    display?: 'auto' | 'background' | 'inverse-background' | 'none'; // Add display property
    color?: string; // Add color property
    backgroundColor?: string; // Add backgroundColor property
}


const AbsenceList: React.FC<AbsenceListProps> = (props) => {
    const { sp, requestModalOpen, approveModalOpen, showHistory = false } = props
    const [ absences, setAbsences ] = React.useState<IAbsence[]>([]);
    const [ contacts, setContacts ] = React.useState<IContact[]>([]);
    const [ displayedAbsences, setDisplayedAbsences ] = React.useState<IAbsence[]>([]);

    const [ absenceTypeOptions, setAbsenceTypeOptions ] = React.useState<IDropdownOption[]>([]);

    const [ absenceType, setAbsenceType ] = React.useState<IAbsenceType | undefined>(undefined);
    const [ departmentKey, setDepartmentKey ] = React.useState<string | number>("");
    const [ departmentOptions, setDepartmentOptions ] = React.useState<IDropdownOption[]>([]);
    const [ nameText, setNameText ] = React.useState<string>('');
    const [ activeFilter, setActiveFilter ] = React.useState<string>('');
    const [ activeNameFilter, setActiveNameFilter ] = React.useState<string>('');
    const [ showPastMonth, setShowPastMonth ] = React.useState<boolean>(false);



    // #region SetUp
    const fetchAbsences = async (filter: string = ""): Promise<IAbsence[]> => {
        return await fetchAbsencesWithFilter(sp, filter);
    }


    const fetchAbsenceContacts = async (currentAbsences: IAbsence[]): Promise<void> => {
       try {
            if (currentAbsences.length === 0) return;

            // 1. Get unique employee IDs from the absences list
            const absenceContactIds: number[] = []
            
            currentAbsences.forEach((absence: IAbsence) => {
                if (!absenceContactIds.includes(absence.Employee.Id)) {
                    absenceContactIds.push(absence.Employee.Id);
                }
            })

            if (absenceContactIds.length === 0) return;
            // 2. Build a single filter query to get all contacts at once.
            const filterQuery = absenceContactIds.map(id => `ID eq ${id}`).join(' or ');
            
            // 3. Fetch all contacts in a single request.
            const resolvedContacts = await fetchContactItems(sp, ['Id', 'Title', 'FirstName', 'LastName'], filterQuery);

            setContacts(resolvedContacts);

        } catch (error) {
            console.error("Error fetching contacts: ", error);
            return;
        }
    }


    const calendarEvents = React.useMemo(() => {
        const allAbsences: ICallendarEvent[] = [];
        displayedAbsences.forEach((absence: IAbsence) => {
            const employee = contacts.find(contact => contact.Id === absence.Employee.Id);
            const title = employee ? `${employee.FirstName || ''} ${employee.LastName || ''}` : 'Unknown Employee';
            const event: ICallendarEvent = {
                title: title,
                start: absence.From.toString(),
                end: absence.To.toString()
            }
            allAbsences.push(event);
        });
        return allAbsences;
    }, [displayedAbsences, contacts]);

    // #endregion


    const loadInitialData = async (filter?: string): Promise<void> => {
        try {
            const fetchedAbsences = await fetchAbsences(filter);
            setAbsences(fetchedAbsences);
            await fetchAbsenceContacts(fetchedAbsences);
        } catch (error) {
            console.error("Error loading absence data: ", error);
        }
    };


    const fetchAbsenceTypes = async (): Promise<void> => {
        try {
            const absenceTypes = await fetchAbsenceTypesService(sp);
    
            if (absenceTypes && absenceTypes.length > 0) {
                const options: IDropdownOption[] = absenceTypes.map((type: IAbsenceType) => ({
                    key: type.Id,
                    text: type.Title
                }));
                setAbsenceTypeOptions(options);
            }
        } catch (error) {
            console.error("Error fetching absence types: ", error);
        }
    }


    const onNameChange = (event: React.FormEvent<HTMLInputElement>): void => {
        setNameText(event.currentTarget.value);
    }

    const onOptionChange = (event: React.FormEvent<HTMLDivElement>, option?: IDropdownOption): void => {
        if (option) {
            setAbsenceType({ Id: option.key as number, Title: option.text });
        } else {
            setAbsenceType(undefined);
        }
      };

    const onDepartmentChange = (event: React.FormEvent<HTMLDivElement>, option?: IDropdownOption): void => {
        if (option) {
            setDepartmentKey(option.key);
        } else {
            setDepartmentKey("");
        }
    };

    const onShowPastMonthChange = (ev?: React.FormEvent<HTMLElement | HTMLInputElement>, isChecked?: boolean): void => {
        setShowPastMonth(!!isChecked);
    }

    const createFilter = async (): Promise<void> => {
        const filterParts: string[] = [];
        if (absenceType) {
            filterParts.push(`(AbsenceTypeId eq '${absenceType.Id}')`);
        }

        if (departmentKey) {
            const uniqueEmployeeIds = await fetchEmployeeIdsByDepartment(sp, departmentKey as number);
            if (uniqueEmployeeIds.length > 0) {
                const idFilter = uniqueEmployeeIds.map(id => `Employee/Id eq ${id}`).join(' or ');
                filterParts.push(`(${idFilter})`);
            } else {
                filterParts.push(`(Employee/Id eq -1)`);
            }
        }
        filterParts.push(`(Rejected eq false)`);
        const combinedFilter = filterParts.join(' and ');
        setActiveFilter(combinedFilter);
        setActiveNameFilter(nameText);
    }

    const onClearFilterClick = (): void => {
        setNameText('');
        setAbsenceType(undefined);
        setDepartmentKey("");
        setActiveFilter('');
        setActiveNameFilter('');
        setShowPastMonth(false);
    }


    useEffect(() => {
        
        loadInitialData(activeFilter).catch(error => {
            console.error("An error occurred during initial data load:", error);
        });
        fetchAbsenceTypes().catch(error => {
            console.error("An error occurred during absence types load:", error);
        });
        fetchAllDepartments(sp).then(departments => {
            const options: IDropdownOption[] = departments.map(dep => ({ key: dep.UniqueCode, text: `${dep.UniqueCode} - ${dep.Title}`}));
            options.unshift({ key: "", text: "Všechna oddělení" });
            setDepartmentOptions(options);
        }).catch(error => console.error("Error fetching departments:", error));
    }, []);

    useEffect(() => {
        let filtered: IAbsence[] = absences;

        if (activeNameFilter.trim() !== "") {
            const nameFilterLower = activeNameFilter.trim().toLowerCase();
            filtered = absences.filter(absence => {
                const employee = contacts.find(contact => contact.Id === absence.Employee.Id);
                if (employee) {
                    const fullName = `${employee.FirstName || ''} ${employee.LastName || ''}`.toLowerCase();
                    return fullName.includes(nameFilterLower);
                }
                return false; // If employee not found, don't include in filtered list
            });
        }

        if (!showHistory) {
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Start of today for comparison
            
            let cutoffDate = new Date(today.getFullYear(), today.getMonth(), 1);
            if (showPastMonth) {
                cutoffDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            }
            
            filtered = filtered.filter(absence => {
                const toDate = new Date(absence.To);
                toDate.setHours(0, 0, 0, 0);

                // Show any absence that has not ended before today.
                return toDate >= cutoffDate;
            });
        }

        setDisplayedAbsences(filtered);
    }, [absences, contacts, activeNameFilter, showHistory, showPastMonth]);

    useEffect(() => {
    
        loadInitialData(activeFilter).catch(error => {
            console.error("An error occurred during initial data load:", error);
        });
    }, [requestModalOpen, approveModalOpen, activeFilter]);


    const columns: IColumn[] = [
        {
            key: 'employee', name: 'Jméno', fieldName: 'Employee.Id', minWidth: 130, isResizable: true,
            onRender: (item: IAbsence) => {
                const employee: IContact | undefined = contacts.find(contact => contact.Id === item.Employee.Id);
                if (employee) {
                    return <span>{employee.FirstName} {employee.LastName}</span>;
                }
                return <span>Neznámý zaměstnanec</span>;
            }
        },
        {
            key: 'type', name: 'Typ', fieldName: 'AbsenceType.Title', minWidth: 80, isResizable: true,
            onRender: (item: IAbsence) => <span>{item.AbsenceType.Title}</span>,
        },
        {
            key: 'from', name: 'Od', fieldName: 'From', minWidth: 100, isResizable: true,
            // 2. Use onRender to format the date cell
            onRender: (item: IAbsence) => <span>{formatDate(item.From.toString())}</span>,
        },
        {
            key: 'to', name: 'Do', fieldName: 'To', minWidth: 100, isResizable: true,
            onRender: (item: IAbsence) => <span>{formatDate(item.To.toString())}</span>,
        },
        {
            key: 'notes', name: 'Poznámka', fieldName: 'Notes', minWidth: 200, isResizable: true,
        },
        {
            key: 'status', name: 'Potvrzeno', fieldName: 'Approved', minWidth: 65, isResizable: true,
            // 3. Use onRender to create a modern status badge
            onRender: (item: IAbsence) => (
                <span className={item.Approved ? styles.statusApproved : styles.statusPending} title={item.Approved ? "Schváleno" : "Čeká na schválení"}>
                    {item.Approved ? <CheckmarkFilled /> : <DismissFilled />}
                </span>
            ),
        },
    ];

    const validRangeStart = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);

    return (
        <div> 
            <div className={styles.filtersContainer}>
                <TextField label="Jméno:" placeholder="Zadejte jméno nebo příjmení..." 
                    value={nameText} 
                    onChange={onNameChange} />
                <Dropdown
                    label="Typ absence:"
                    placeholder="Vyberte typ absence"
                    options={absenceTypeOptions}
                    selectedKey={absenceType ? absenceType.Id : null}
                    onChange={onOptionChange}
                    />
                <Dropdown
                    label="Oddělení:"
                    placeholder="Vyberte oddělení"
                    options={departmentOptions}
                    selectedKey={departmentKey}
                    onChange={onDepartmentChange}
                    />
                <Checkbox 
                    label="Zobrazit historii (1 měsíc)" 
                    checked={showPastMonth} 
                    onChange={onShowPastMonthChange} 
                    styles={{ root: { marginTop: 30 } }} />
            </div>
            <div className={styles.actionsContainer}>
                <div className={styles.leftActions}>
                    <PrimaryButton text="Použít filtry" onClick={createFilter} style={{ marginRight: '8px' }} />
                    <PrimaryButton text="Vymazat filtry" onClick={onClearFilterClick} />
                </div>
                <IconButton
                    iconProps={{ iconName: 'Refresh' }}
                    title="Obnovit"
                    ariaLabel="Obnovit"
                    onClick={() => loadInitialData(activeFilter)}
                />
            </div>
            <TabsView>
                <PivotItem headerText='Seznam' itemKey='list'> {/* if the TimeType isnt FullDay, display the time too */}
                    <DetailsList
                        items={displayedAbsences}
                        columns={columns}
                        setKey="set"
                        layoutMode={DetailsListLayoutMode.justified} // 2. Change to fixedColumns
                        constrainMode={ConstrainMode.horizontalConstrained}
                        selectionMode={SelectionMode.none} // Or SelectionMode.single, etc.
                        isHeaderVisible={true} 
                        compact={true} />
                </PivotItem>
                <PivotItem headerText='Kalendář' itemKey='calendar'>
                    <FullCalendar
                        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                        eventSources={[
                            { events: calendarEvents }, // User absences
                            { events: getCzechHolidaysCallendarEvents(new Date().getFullYear()) }, // Holidays for current year
                            { events: getCzechHolidaysCallendarEvents(new Date().getFullYear() + 1) } // Holidays for next year
                        ]}
                        headerToolbar={{
                            left: 'title',
                            center: '',
                            right: 'today prev,next'
                        }}
                        locale={cs}
                        firstDay={1}

                        initialView='dayGridMonth'  
                        validRange={{
                            start: validRangeStart
                        }}
                
                        editable={false} 
                        selectable={true}
                        displayEventTime={false} />
                </PivotItem>
            </TabsView>

        </div>
    )
}

export default AbsenceList;
