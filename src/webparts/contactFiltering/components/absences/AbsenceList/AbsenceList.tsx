import * as React from 'react';
import styles from './AbsenceList.module.scss';
import { SPFI } from '@pnp/sp';
import { useEffect } from 'react';
import { IAbsence } from '../AbsenceInterfaces';
import { ConstrainMode, DetailsList, DetailsListLayoutMode, IColumn, SelectionMode } from '@fluentui/react';
import { CheckmarkFilled, DismissFilled } from '@fluentui/react-icons';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { formatDate } from '../../../../../utils/dateUtils';
import { IContact } from '../../../models/IContact';


export interface AbsenceListProps {
    sp: SPFI;
}


export interface ICallendarEvent {
    title?: string;
    start: string;
    end: string;
    //Add color: and backgroundcolor: based on some parameters if needed, or atleast unify all colors
}


const AbsenceList: React.FC<AbsenceListProps> = (props) => {
    const { sp } = props
    const [ absences, setAbsences ] = React.useState<IAbsence[]>([]);
    const [ contacts, setContacts ] = React.useState<IContact[]>([]);

    // #region SetUp
    const fetchAbsences = async (): Promise<IAbsence[]> => {
        try {
            const result = await sp.web.lists.getByTitle('Absence').items
                .select('Id', 'Title', 
                    'Employee/Id', 'Employee/Title', 
                    'AbsenceType', 'To',
                    'From', 'Notes', 'NoteForLeader', 'Approved').expand('Employee')();
    
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


    const initialEvents = async (): Promise<ICallendarEvent[]> => {
        
        const allAbsences: ICallendarEvent[] = [];

        absences.forEach((absence: IAbsence) => {
            const event: ICallendarEvent = {
                title: 
                    contacts.find(contact => contact.Id === absence.Employee.Id)?.FirstName 
                    + " " + contacts.find(contact => contact.Id === absence.Employee.Id)?.LastName,
                start: absence.From.toString(),
                end: absence.To.toString()
            }
            allAbsences.push(event);
        });

        return allAbsences;
    }
    // #endregion


    useEffect(() => {
        const loadInitialData = async (): Promise<void> => {
            try {
                const fetchedAbsences = await fetchAbsences();
                setAbsences(fetchedAbsences);
                await fetchAbsenceContacts(fetchedAbsences);
            } catch (error) {
                console.error("Error loading absence data: ", error);
            }
        };
    
        loadInitialData().catch(error => {
            console.error("An error occurred during initial data load:", error);
        });
    }, []);


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
            key: 'type', name: 'Typ', fieldName: 'AbsenceType', minWidth: 80, isResizable: true,
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
        <div> {/* Add a tab style, one for list view, other for calendar view
        
                Make filtering BEFORE the tabs, to filter by names or reason of absence
                logic should be the same for both, just applying them a bit differently*/}
            <DetailsList
                items={absences}
                columns={columns}
                setKey="set"
                layoutMode={DetailsListLayoutMode.justified} // 2. Change to fixedColumns
                constrainMode={ConstrainMode.horizontalConstrained}
                selectionMode={SelectionMode.none} // Or SelectionMode.single, etc.
                isHeaderVisible={true} 
                compact={true} />

            <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}

                headerToolbar={{
                    left: 'title',
                    center: '',
                    right: 'today prev,next'
                }}

                initialView='dayGridMonth'
                events={initialEvents}
        
                editable={false} 
                selectable={true}
                displayEventTime={false} />
        </div>
    )
}

export default AbsenceList;
