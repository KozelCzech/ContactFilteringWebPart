import { SPFI } from '@pnp/sp';
import * as React from 'react';
import { IContact } from '../../../models/IContact';
import { ConstrainMode, DetailsList, DetailsListLayoutMode, IColumn, SelectionMode } from '@fluentui/react';
import styles from './ApproveAbsence.module.scss';
import { useEffect, useState } from 'react';
import { IAbsence } from '../AbsenceInterfaces';
import { formatDate } from '../../../../../utils/dateUtils';
import { DefaultButton, PrimaryButton } from '@fluentui/react/lib/Button';
import { fetchUserById } from '../../../../../services/userServices';
import { fetchAbsencesAwaitingApproval, deleteAbsence, updateAbsence } from '../../../../../services/absenceServices';
import { fetchContactItems } from '../../../../../services/contactServices';
import { GraphFI } from '@pnp/graph';
import { sendAbsenceResponseEmail } from '../../../../../utils/emailUtils';

interface IApproveAbsenceProps{
    sp: SPFI;
    user: IContact;
    graph: GraphFI;
    onUpdate: () => void;
}

const ApproveAbsence: React.FC<IApproveAbsenceProps> = (props) => {
    const { sp, user, graph, onUpdate } = props;
    const [ absencesToApprove, setAbsencesToApprove ] = useState<IAbsence[]>([]);
    const [ contacts, setContacts ] = useState<IContact[]>([]);
    const [ isLoaded, setIsLoaded ] = useState<boolean>(false); 


    const fetchAbsenceContacts = async (currentAbsences: IAbsence[]): Promise<void> => {
       try {
            if (currentAbsences.length === 0) return;
            // 1. Get unique employee IDs from the absences list
            const absenceContactIds = Array.from(new Set(currentAbsences.map(absence => absence.Employee.Id)));

            if (absenceContactIds.length === 0) return;

            // 2. Build a single filter query to get all contacts at once.
            const filterQuery = absenceContactIds.map(id => `ID eq ${id}`).join(' or ');
            
            const resolvedContacts = await fetchContactItems(sp, ['Id', 'Title', 'FirstName', 'LastName'], filterQuery);
            
            setContacts(resolvedContacts);

        } catch (error) {
            console.error("Error fetching contacts: ", error);
            return;
        }
    };

    const handleApprove = async (absence: IAbsence): Promise<void> => {
        try {

            const requestee = await fetchUserById(sp, absence.Employee.Id || absence.Employee.ID || 0);

            if (absence.Delete) {
                await sendAbsenceResponseEmail(graph, requestee, absence, "DeletionConfirmed");
                
                await deleteAbsence(sp, absence.Id);
            } else {
                await sendAbsenceResponseEmail(graph, requestee, absence, "Approved");

                await updateAbsence(sp, absence.Id, {
                    Approved: true
                });
            }
            // Refresh the list after approval
            const fetchedAbsences = await fetchAbsencesAwaitingApproval(sp, user);
            setAbsencesToApprove(fetchedAbsences);
            await fetchAbsenceContacts(fetchedAbsences);
        } catch (error) {
            console.error("Error approving absence: ", error);
        }
    };

    const handleReject = async (absence: IAbsence): Promise<void> => {
        try {
            const requestee = await fetchUserById(sp, absence.Employee.Id);

            const absenceId = absence.Id;
            if (absence.Delete) {
                await sendAbsenceResponseEmail(graph, requestee, absence, "DeletionRejected");

                await updateAbsence(sp, absenceId, {
                    Delete: false
                });
            } else {
                await sendAbsenceResponseEmail(graph, requestee, absence, "Rejected");

                await updateAbsence(sp, absenceId, {
                    Approved: false,
                    Rejected: true,
                    Delete: false
                });
            }
            // Refresh the list after rejection
            const fetchedAbsences = await fetchAbsencesAwaitingApproval(sp, user);
            setAbsencesToApprove(fetchedAbsences);
            await fetchAbsenceContacts(fetchedAbsences);
        } catch (error) {
            console.error("Error rejecting absence: ", error);
        }
    };

    const hasDeleteRequest = absencesToApprove.some(item => item.Delete);

    const columns: IColumn[] = [
            {
                key: 'actions',
                name: 'Akce',
                minWidth: hasDeleteRequest ? 270 : 220,
                maxWidth: hasDeleteRequest ? 350 : 270, // Optional: prevents it from getting too huge on ultrawide monitors
                isResizable: false,
                onRender: (item: IAbsence) => (
                    <div>
                        <PrimaryButton 
                            text={item.Delete ? "Smazat" : "Schválit"} 
                            onClick={() => handleApprove(item)} 
                            className={item.Delete ? styles.deleteButton : undefined}
                            styles={{ root: { marginRight: 8 } }} 
                        />
                        <DefaultButton text={item.Delete ? "Odmítnout Smazání" : "Odmítnout"} onClick={() => handleReject(item)} />
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
                key: 'type', name: 'Typ', fieldName: 'AbsenceType', minWidth: 80, isResizable: false,
                onRender: (item: IAbsence) => <span>{item.AbsenceType.Title}</span>,
            },
            {
                key: 'from', name: 'Od', fieldName: 'From', minWidth: 100, isResizable: false,
                // 2. Use onRender to format the date cell
                onRender: (item: IAbsence) => <span>{formatDate(item.From.toString())}</span>,
            },
            {
                key: 'to', name: 'Do', fieldName: 'To', minWidth: 100, isResizable: false,
                onRender: (item: IAbsence) => <span>{formatDate(item.To.toString())}</span>,
            },
            {
                key: 'notes', name: 'Poznámka', fieldName: 'Notes', minWidth: 200, isResizable: false,
            },
            {
                key: 'noteForLeader', name: 'Poznámka pro vedoucího', fieldName: 'NoteForLeader', minWidth: 200, isResizable: false,
            }
        ];


    //button to approve of reject an absence, rejecting deletes it
    useEffect(() => {
        const loadAbsences = async (): Promise<void> => {
            const fetchedAbsences = await fetchAbsencesAwaitingApproval(sp, user);
            setAbsencesToApprove(fetchedAbsences);
            await fetchAbsenceContacts(fetchedAbsences);
            setIsLoaded(true);
        };
        loadAbsences().catch(console.error);
    }, [sp]);

    useEffect(() => {
        if (absencesToApprove.length === 0 && isLoaded === true) onUpdate();
    }, [absencesToApprove])


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