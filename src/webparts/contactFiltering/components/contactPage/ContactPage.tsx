import * as React from 'react';
import styles from './ContactPage.module.scss'; // Your SCSS styles
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/items";
import { IContact } from '../../models/IContact';
import { useEffect, useState } from 'react';
import { SPFI } from '@pnp/sp';
import { Icon } from '@fluentui/react';
import { fetchPositionByUserId, IPosition } from '../../../../services/userServices';

export interface IContactPageProps {
    contact: IContact;
    webAbsoluteUrl: string;
    sp: SPFI;
}


const ContactPage: React.FC<IContactPageProps> = (props) => {
    const { sp, contact, webAbsoluteUrl } = props;

    const [ position, setPosition ] = useState<IPosition | undefined>(undefined);


    const listName = "ContactFilteringTest";
    const attachmentId = contact.Id;
    let attachmentUrl = "";
    try {
        if (contact.Image) {
            const attachmentName = JSON.parse(contact.Image).fileName;
            attachmentUrl = `${webAbsoluteUrl}/Lists/${listName}/Attachments/${attachmentId}/${attachmentName}`;
        }
    } catch (e) {
        console.error("Error parsing contact image JSON: ", e);
    }

    useEffect(() => {
        fetchPositionByUserId(sp, contact.Id).then(setPosition).catch(console.error);
    }, [contact, sp])


    return (
        <div className={styles.contactPage}>
            <div className={styles.header}>
                {attachmentUrl && (
                    <img
                        src={attachmentUrl}
                        className={styles.contactImage}
                    />
                )}
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
        </div>
    );
}

export default ContactPage;