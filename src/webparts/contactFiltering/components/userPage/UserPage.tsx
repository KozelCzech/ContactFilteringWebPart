import * as React from 'react';
import styles from './UserPage.module.scss'; // Your SCSS styles
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/items";
import { IContact } from '../../models/IContact';
//import { ITag } from '../tagFolder/TagHolder';
import { useEffect, useState } from 'react';
import { SPFI } from '@pnp/sp';
import { ConstrainMode, DetailsList, DetailsListLayoutMode, IColumn, SelectionMode, Icon, Toggle } from '@fluentui/react';
//import { getContrastColor } from '../../../../utils/colorUtils';
import { CheckmarkFilled, DismissFilled, ClockFilled } from '@fluentui/react-icons';
import { IAbsence } from '../absences/AbsenceInterfaces';
import { formatDate } from '../../../../utils/dateUtils';
import { fetchPositionByUserId, fetchUserById, IPosition, fetchMainCommitment, ICommitment } from '../../../../services/userServices';
import { fetchAbsences, updateAbsence } from '../../../../services/absenceServices';
import { fetchTotalPTOHours, PTOHoursLeft } from '../../../../services/ptoServices';
import RequestAbsence from '../absences/requestAbsence/RequestAbsence';
import { GraphFI } from '@pnp/graph';
import { sendAbsenceEmail } from '../../../../utils/emailUtils';


export interface IUserPageProps {
    contact: IContact;
    webAbsoluteUrl: string;
    sp: SPFI;
    graph: GraphFI;
    //isTagCreator: boolean;
    //onUpdate: () => void;
    onAbsenceUpdate?: () => void;
}


const UserPage: React.FC<IUserPageProps> = (props) => {
    const { sp, graph, contact, webAbsoluteUrl, onAbsenceUpdate /*isTagCreator, onUpdate*/ } = props;

    const [ absences, setAbsences ] = useState<IAbsence[]>([]);
    const [ timeOffLeft, setTimeOffLeft ] = useState<number>(contact.TimeOffHours || 0);
    const [ daysOffLeft, setDaysOffLeft ] = useState<number>(0);
    const [ hoursTotal, setHoursTotal ] = useState<number>(0);
    const [ daysTotal, setDaysTotal ] = useState<number>(0);
    const [ position, setPosition ] = useState<IPosition | undefined>(undefined);
    const [ commitment, setCommitment ] = useState<ICommitment | undefined>(undefined);
    const [ absenceToEdit, setAbsenceToEdit ] = useState<IAbsence | undefined>(undefined);
    const [ absenceToDeleteId, setAbsenceToDeleteId ] = useState<number | undefined>(undefined);
    const [ showPastAbsences, setShowPastAbsences ] = useState<boolean>(false);

    const listName = "ContactFilteringTest";
    const attachmentId = contact.Id;
    const attachmentName = JSON.parse(contact.Image || "").fileName;
    const attachmentUrl = `${webAbsoluteUrl}/Lists/${listName}/Attachments/${attachmentId}/${attachmentName}`;    


    const deleteUserAbsence = async (Id: number): Promise<void> => {
        await updateAbsence(sp, Id, { Delete: true });

        const absence = absences.find(a => a.Id === Id);
        if (!absence) return;
        console.log(absence);
        const approvee = await fetchUserById(sp, absence.Approvee.Id || absenceToEdit?.Approvee.ID || 0);

        await sendAbsenceEmail(graph, sp, approvee, absence, "Deleted");
        if (onAbsenceUpdate) onAbsenceUpdate();
        fetchAbsences(sp, contact.Id).then(setAbsences).catch(console.error);  
    }


    useEffect(() => {
        fetchPositionByUserId(sp, contact.Id).then(setPosition).catch(console.error);
        fetchMainCommitment(sp, contact.Id).then(setCommitment).catch(console.error);

        fetchAbsences(sp, contact.Id).then(absences => {
                setAbsences(absences);
                }).catch(error => {
                console.error("Error fetching absences: ", error);
            });
        
        fetchTotalPTOHours(sp, contact.Id).then(ptoLeft => {
            const totalHoursForYear = ptoLeft?.PTOAmount || 0;
            
            setHoursTotal(totalHoursForYear);

            const totalDaysforYear = Math.round((totalHoursForYear / (commitment?.WorkHoursPerDay || 8)) * 10) / 10;
            setDaysTotal(totalDaysforYear);
        }).catch(error => {
            console.log("Error fetching total PTO hours: ", error);
        });



        PTOHoursLeft(sp, contact.Id).then(hours => {
            setTimeOffLeft(hours);
            const daysLeft = Math.round((hours / (commitment?.WorkHoursPerDay || 8)) * 10) / 10;
            setDaysOffLeft(daysLeft);
        }).catch(error => {
            console.log("Error fetching PTO hours: ", error);
        });       
    
        
    }, [contact, sp])


    const columns: IColumn[] = [
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
            key: 'notes', name: 'Poznámka', fieldName: 'Notes', minWidth: 300, isResizable: true,
        },
        {
            key: 'status', name: 'Potvrzeno', fieldName: 'Approved', minWidth: 90, isResizable: true,
            // 3. Use onRender to create a modern status badge
            onRender: (item: IAbsence & { Rejected?: boolean }) => {
                if (item.Delete) {
                    return <span className={styles.statusDeleted} title="Smazáno"><DismissFilled /></span>;
                } else if (item.Rejected) {
                    return <span className={styles.statusRejected} title="Zamítnuto"><DismissFilled /></span>;
                } else if (item.Approved) {
                    return <span className={styles.statusApproved} title="Schváleno"><CheckmarkFilled /></span>;
                } else {
                    return <span className={styles.statusPending} title="Čeká na schválení"><ClockFilled /></span>;
                }
            },
        },
        {
            key: 'edit', name: 'Upravit', fieldName: 'edit', minWidth: 60, isResizable: false,
            onRender: (item: IAbsence) => {
                if (absenceToDeleteId === item.Id) {
                    return (
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <Icon iconName="CheckMark" style={{ cursor: 'pointer', fontSize: '16px', color: '#107C10' }} title="Potvrdit" onClick={() => deleteUserAbsence(item.Id)} />
                            <Icon iconName="Cancel" style={{ cursor: 'pointer', fontSize: '16px', color: '#a4262c' }} title="Zrušit" onClick={() => setAbsenceToDeleteId(undefined)} />
                        </div>
                    );
                }
                return (
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <Icon iconName="Edit" style={{ cursor: 'pointer', fontSize: '16px', color: '#0078d4' }} title="Upravit" onClick={() => setAbsenceToEdit(item)} />
                        <Icon iconName="Delete" style={{ cursor: 'pointer', fontSize: '16px', color: '#a4262c' }} title="Smazat" onClick={() => setAbsenceToDeleteId(item.Id)} />
                    </div>
                );
            }
        }
    ];

    

    const currentYear = new Date().getFullYear();
    const filteredAbsences = showPastAbsences 
        ? absences 
        : absences.filter(a => new Date(a.To).getFullYear() >= currentYear);

    return (
        <div className={styles.contactPage}>
            <div className={styles.header}>
                <img
                    src={attachmentUrl}
                    className={styles.contactImage}
                />
                <div className={styles.headerText}>
                    <h3 style={{ marginBottom: 4 }}>{contact.FirstName || ""}  {contact.LastName || ""}</h3>
                    {position && <div style={{ fontWeight: 600, color: '#0078d4', marginBottom: 2 }}>{position.Title}</div>}
                    {position?.Department && <div style={{ marginBottom: 12, color: '#605e5c', fontSize: '0.9em' }}>{position.Department.Title}</div>}
                    {commitment && commitment.WorkHoursPerDay && (
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4, fontSize: '0.9em', color: '#323130' }}>
                            <Icon iconName="Clock" style={{ marginRight: 8 }} />
                            Denní úvazek: {commitment.WorkHoursPerDay} hodin
                        </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4, fontSize: '0.9em', color: '#323130' }}>
                        <Icon iconName="Calendar" style={{ marginRight: 8 }} />
                        Kredit pro tento rok: {hoursTotal} hodin ({daysTotal} dní)
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4, fontSize: '0.9em', color: '#323130' }}>
                        <Icon iconName="Timer" style={{ marginRight: 8 }} />
                        Zbývající dovolená: {timeOffLeft} hodin ({daysOffLeft} dní)
                    </div>
                    {commitment && commitment.From && (
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4, fontSize: '0.9em', color: '#323130' }}>
                            <Icon iconName="Calendar" style={{ marginRight: 8 }} />
                            {formatDate(commitment.From.toString())} - {commitment.To ? formatDate(commitment.To.toString()) : 'Na Dobu Neurčitou'}
                        </div>
                    )}

                    <div style={{ fontSize: '0.9em', color: '#323130' }}>
                        {contact.PhoneNumber && <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}><Icon iconName="Phone" style={{ marginRight: 8 }} /> {contact.PhoneNumber}</div>}
                        {contact.Email && <div style={{ display: 'flex', alignItems: 'center' }}><Icon iconName="Mail" style={{ marginRight: 8 }} /> {contact.Email}</div>}
                    </div>
                </div>
            </div>
            <div className={styles.content}>
                            <div style={{ marginBottom: '10px' }}>
                                <Toggle 
                                    label="Zobrazit minulé roky" 
                                    inlineLabel 
                                    checked={showPastAbsences} 
                                    onChange={(_, checked) => setShowPastAbsences(!!checked)} 
                                />
                            </div>
                            <DetailsList
                                items={filteredAbsences}
                                columns={columns}
                                setKey="set"
                                layoutMode={DetailsListLayoutMode.justified} // 2. Change to fixedColumns
                                constrainMode={ConstrainMode.horizontalConstrained}
                                selectionMode={SelectionMode.none} // Or SelectionMode.single, etc.
                                isHeaderVisible={true} 
                                compact={true}/>
                            {absenceToEdit && (
                                <div style={{maxWidth: 1200, minWidth: 800, margin: '0 auto'}}>
                                    <RequestAbsence
                                        sp={sp}
                                        graph={graph}
                                        user={contact}
                                        existingAbsence={absenceToEdit}
                                        onUpdate={() => {
                                            setAbsenceToEdit(undefined);
                                            fetchAbsences(sp, contact.Id).then(setAbsences).catch(console.error);
                                            if (onAbsenceUpdate) onAbsenceUpdate();
                                        }}
                                    />
                                </div>
                            )}
                </div>
            
        </div>
    );
}

export default UserPage;