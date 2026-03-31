import * as React from 'react';
import styles from './ContactPage.module.scss'; // Your SCSS styles
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/items";
import { IContact } from '../../models/IContact';
//import { ITag } from '../tagFolder/TagHolder';
import { useEffect, useState } from 'react';
import { SPFI } from '@pnp/sp';
import { ConstrainMode, DetailsList, DetailsListLayoutMode, IColumn, SelectionMode, Icon, Toggle } from '@fluentui/react';
//import { getContrastColor } from '../../../../utils/colorUtils';
import { CheckmarkFilled, DismissFilled } from '@fluentui/react-icons';
import { IAbsence } from '../absences/AbsenceInterfaces';
import { formatDate } from '../../../../utils/dateUtils';
import { fetchPositionByUserId, IPosition } from '../../../../utils/userUtils';


export interface IContactPageProps {
    contact: IContact;
    webAbsoluteUrl: string;
    sp: SPFI;
}


const ContactPage: React.FC<IContactPageProps> = (props) => {
    const { sp, contact, webAbsoluteUrl } = props;

    const [ absences, setAbsences ] = useState<IAbsence[]>([]);
    const [ position, setPosition ] = useState<IPosition | undefined>(undefined);
    const [ showPastAbsences, setShowPastAbsences ] = useState<boolean>(false);



    const listName = "ContactFilteringTest";
    const attachmentId = contact.Id;
    const attachmentName = JSON.parse(contact.Image || "").fileName;
    const attachmentUrl = `${webAbsoluteUrl}/Lists/${listName}/Attachments/${attachmentId}/${attachmentName}`;


    const fetchAbsences = async (): Promise<void> => {
        try {
            const result = await sp.web.lists.getByTitle('Absence').items
                .select('Id', 'Title', 
                    'Employee/Id', 'Employee/Title', 
                    'AbsenceType/Id', 'AbsenceType/Title', 'To',
                    'From', 'Notes', 'Approved').expand('Employee', 'AbsenceType').filter(`Employee/Id eq '${contact.Id}'`)();
    
            setAbsences(result as IAbsence[]);
        } catch (exception){
            console.error("Error fetching absences: ", exception);
        }
    }



    useEffect(() => {
        fetchPositionByUserId(sp, contact.Id).then(setPosition).catch(console.error);
        fetchAbsences().catch(error => {
            console.log("Error fetching absences: ", error);
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
            onRender: (item: IAbsence) => (
                <span className={item.Approved ? styles.statusApproved : styles.statusPending} title={item.Approved ? "Schváleno" : "Čeká na schválení"}>
                    {item.Approved ? <CheckmarkFilled /> : <DismissFilled />}
                </span>
            ),
        },
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
                </div>
            
        </div>
    );
}

export default ContactPage;