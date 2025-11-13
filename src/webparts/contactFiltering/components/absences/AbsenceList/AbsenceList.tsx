import * as React from 'react';
import styles from './AbsenceList.module.scss';
import { SPFI } from '@pnp/sp';
import { useEffect } from 'react';
import { IAbsence, IAbsenceType } from '../AbsenceInterfaces';
import { ConstrainMode, DetailsList, DetailsListLayoutMode, Dropdown, IColumn, IconButton, IDropdownOption, PivotItem, PrimaryButton, SelectionMode, TextField } from '@fluentui/react';
import { CheckmarkFilled, DismissFilled } from '@fluentui/react-icons';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { formatDate, getCzechHolidaysCallendarEvents } from '../../../../../utils/dateUtils';
import { IContact } from '../../../models/IContact';
import TabsView from '../../subComponents/tabsView/tabsView';

import dayGridPlugin from '@fullcalendar/daygrid';


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
    const [ nameText, setNameText ] = React.useState<string>('');
    const [ activeFilter, setActiveFilter ] = React.useState<string>('');
    const [ activeNameFilter, setActiveNameFilter ] = React.useState<string>('');



    // #region SetUp
    const fetchAbsences = async (filter: string = ""): Promise<IAbsence[]> => {
        try {
            const items = sp.web.lists.getByTitle('Absence').items
                .select('Id', 'Title', 
                    'Employee/Id', 'Employee/Title',
                    'AbsenceType/Id', 'AbsenceType/Title', 'To',
                    'From', 'Notes', 'NoteForLeader', 'Approved').expand('Employee,AbsenceType');
            
            const result = filter ? await items.filter(filter)() : await items();

            return result as IAbsence[];
        } catch (error) {
            console.error("Error fetching options: ", error);
            return [];
        }
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
            const resolvedContacts = await sp.web.lists.getByTitle('ContactFilteringTest').items
                .select('ID', 'Title', 'FirstName', 'LastName')
                .filter(filterQuery)();

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
            // Assumes your list is named 'Absences' and the choice field is 'AbsenceType'
            const results = await sp.web.lists.getByTitle("AbsenceTypes").items
                .select("Id", "Title")();
    
            const absenceTypes: IAbsenceType[] = results;
    
            if (absenceTypes && absenceTypes.length > 0) {
                const options: IDropdownOption[] = absenceTypes.map(type => ({
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

    const createFilter = (): void => {
        const filterParts: string[] = [];
        if (absenceType) {
            filterParts.push(`(AbsenceTypeId eq '${absenceType.Id}')`);
        }

        const combinedFilter = filterParts.join(' and ');
        setActiveFilter(combinedFilter);
        setActiveNameFilter(nameText);
    }

    const onClearFilterClick = (): void => {
        setNameText('');
        setAbsenceType(undefined);
        setActiveFilter('');
        setActiveNameFilter('');
    }


    useEffect(() => {
        
        loadInitialData(activeFilter).catch(error => {
            console.error("An error occurred during initial data load:", error);
        });
        fetchAbsenceTypes().catch(error => {
            console.error("An error occurred during absence types load:", error);
        });
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
            
            filtered = filtered.filter(absence => {
                const toDate = new Date(absence.To);
                toDate.setHours(0, 0, 0, 0);

                // Show any absence that has not ended before today.
                return toDate >= today;
            });
        }

        setDisplayedAbsences(filtered);
    }, [absences, contacts, activeNameFilter, showHistory]);

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
                return <span>Unknown Employee</span>;
            }
        },
        {
            key: 'type', name: 'Typ', fieldName: 'AbsenceType.Title', minWidth: 80, isResizable: true,
            onRender: (item: IAbsence) => <span>{item.AbsenceType.Title}</span>,
        },
        {
            key: 'from', name: 'Od', fieldName: 'From', minWidth: 65, isResizable: true,
            // 2. Use onRender to format the date cell
            onRender: (item: IAbsence) => <span>{formatDate(item.From.toString())}</span>,
        },
        {
            key: 'to', name: 'Do', fieldName: 'To', minWidth: 65, isResizable: true,
            onRender: (item: IAbsence) => <span>{formatDate(item.To.toString())}</span>,
        },
        {
            key: 'notes', name: 'Poznámka', fieldName: 'Notes', minWidth: 200, isResizable: true,
        },
        {
            key: 'status', name: 'Potvrzeno', fieldName: 'Approved', minWidth: 65, isResizable: true,
            // 3. Use onRender to create a modern status badge
            onRender: (item: IAbsence) => (
                <span className={item.Approved ? styles.statusApproved : styles.statusPending}>
                    {item.Approved ? <CheckmarkFilled title="Approved" /> : <DismissFilled title="Pending" />}
                </span>
            ),
        },
    ];


    return (
        <div> 
            <div className={styles.filtersContainer}>
                <TextField label="Name:" placeholder="Enter first or last name..." 
                    value={nameText} 
                    onChange={onNameChange} />
                <Dropdown
                    label="Absence Type:"
                    placeholder="Select an Absence Type"
                    options={absenceTypeOptions}
                    selectedKey={absenceType ? absenceType.Id : null}
                    onChange={onOptionChange}
                    />
            </div>
            <div className={styles.actionsContainer}>
                <div className={styles.leftActions}>
                    <PrimaryButton text="Apply Filters" onClick={createFilter} style={{ marginRight: '8px' }} />
                    <PrimaryButton text="Clear Filters" onClick={onClearFilterClick} />
                </div>
                <IconButton
                    iconProps={{ iconName: 'Refresh' }}
                    title="Refresh"
                    ariaLabel="Refresh"
                    onClick={() => loadInitialData(activeFilter)}
                />
            </div>
            <TabsView>
                <PivotItem headerText='List' itemKey='list'> {/* if the TimeType isnt FullDay, display the time too */}
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
                <PivotItem headerText='Calendar' itemKey='calendar'>
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

                        initialView='dayGridMonth'
                
                        editable={false} 
                        selectable={true}
                        displayEventTime={false} />
                </PivotItem>
            </TabsView>

        </div>
    )
}

export default AbsenceList;
