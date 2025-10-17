import { SPFI } from '@pnp/sp';
import * as React from 'react';
import { IContact } from '../../../models/IContact';
import { ConstrainMode, DetailsList, DetailsListLayoutMode, IColumn, SelectionMode } from '@fluentui/react';
import { useEffect, useState } from 'react';
import { IAbsence } from '../AbsenceInterfaces';
import { formatDate } from '../../../../../utils/dateUtils';
import { DefaultButton, PrimaryButton } from '@fluentui/react/lib/Button';

interface IApproveAbsenceProps{
    sp: SPFI;
    user: IContact;
}

const ApproveAbsence: React.FC<IApproveAbsenceProps> = (props) => {
    const { sp, user } = props;
    const [ absencesToApprove, setAbsencesToApprove ] = useState<IAbsence[]>([]);
    const [ contacts, setContacts ] = useState<IContact[]>([]);


    const fetchAbsencesAwaitingApproval = async (): Promise<IAbsence[]> => {
        try {
            const results = await sp.web.lists.getByTitle('Absence').items
                .select('Id', 'Title', 
                    'Employee/Id', 'Employee/Title', 
                    'AbsenceType', 'To',
                    'From', 'Notes', 'NoteForLeader',
                    'Approved', 'Approvee/Id', 'Approvee/Title')
                .expand('Employee, Approvee')
                .filter('Approved eq false and Approvee/Id eq ' + user.Id)();

            setAbsencesToApprove(results)
            return results as IAbsence[];
        } catch (exception) {
            console.error("Error fetching absences awaiting approval: ", exception);
            return [];
        }
    };


    const fetchAbsenceContacts = async (currentAbsences: IAbsence[]): Promise<void> => {
       try {
            if (currentAbsences.length === 0) return;
            // 1. Get unique employee IDs from the absences list
            const absenceContactIds = Array.from(new Set(currentAbsences.map(absence => absence.Employee.Id)));

            if (absenceContactIds.length === 0) return;

            // 2. Build a single filter query to get all contacts at once.
            const filterQuery = absenceContactIds.map(id => `ID eq ${id}`).join(' or ');
            
            // 3. Fetch all contacts in a single request.
            const resolvedContacts = await sp.web.lists.getByTitle('ContactFilteringTest').items
                .select('ID', 'Title', 'FirstName', 'LastName')
                .filter(filterQuery)();
            
            console.log(resolvedContacts);
            setContacts(resolvedContacts);

        } catch (error) {
            console.error("Error fetching contacts: ", error);
            return;
        }
    };

    const handleApprove = async (absenceId: number): Promise<void> => {
        try {
            await sp.web.lists.getByTitle('Absence').items.getById(absenceId).update({
                Approved: true
            });
            // Refresh the list after approval
            const fetchedAbsences = await fetchAbsencesAwaitingApproval();
            await fetchAbsenceContacts(fetchedAbsences);
        } catch (error) {
            console.error("Error approving absence: ", error);
        }
    };

    const handleReject = async (absenceId: number): Promise<void> => {
        try {
            await sp.web.lists.getByTitle('Absence').items.getById(absenceId).delete();
            // Refresh the list after rejection
            setAbsencesToApprove(absencesToApprove.filter(a => a.Id !== absenceId));
        } catch (error) {
            console.error("Error rejecting absence: ", error);
        }
    };

    const columns: IColumn[] = [
            {
                key: 'actions',
                name: 'Actions',
                minWidth: 170,
                isResizable: false,
                onRender: (item: IAbsence) => (
                    <div>
                        <PrimaryButton text="Approve" onClick={() => handleApprove(item.Id)} styles={{ root: { marginRight: 8 } }} />
                        <DefaultButton text="Reject" onClick={() => handleReject(item.Id)} />
                    </div>
                ),
            },
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
                key: 'noteForLeader', name: 'Poznámka pro vedoucího', fieldName: 'NoteForLeader', minWidth: 200, isResizable: true,
            }
        ];


    //button to approve of reject an absence, rejecting deletes it
    useEffect(() => {
        const loadAbsences = async (): Promise<void> => {
            const fetchedAbsences = await fetchAbsencesAwaitingApproval();   
            await fetchAbsenceContacts(fetchedAbsences);            
        };
        loadAbsences().catch(console.error);
    }, [sp]);


    return (
        <div>
            <DetailsList items={absencesToApprove} 
            columns={columns}
            setKey="set"
            layoutMode={DetailsListLayoutMode.justified} // 2. Change to fixedColumns
            constrainMode={ConstrainMode.horizontalConstrained}
            selectionMode={SelectionMode.none} // Or SelectionMode.single, etc.
            isHeaderVisible={true} 
            compact={true} />
        </div>
    )
}


export default ApproveAbsence;