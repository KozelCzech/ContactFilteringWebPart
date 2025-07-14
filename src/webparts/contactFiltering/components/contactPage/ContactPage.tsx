import * as React from 'react';
import styles from '../ContactFiltering.module.scss'; // Your SCSS styles
import { IContact } from '../../models/IContact';


export interface IContactPageProps {
    contact: IContact;
    webAbsoluteUrl: string;
}


const ContactPage: React.FC<IContactPageProps> = (props) => {
    const { contact, webAbsoluteUrl } = props;

    const listName = "ContactFilteringTest";
    const attachmentId = contact.Id;
    const attachmentName = JSON.parse(contact.Image || "").fileName;
    const attachmentUrl = `${webAbsoluteUrl}/Lists/${listName}/Attachments/${attachmentId}/${attachmentName}`;


    return (
        <div>
            <div>
            <img
                src={attachmentUrl}
                className={styles.contactImage}
            />
        </div>
            <h3>{contact.FirstName || ""}  {contact.LastName || ""}</h3>
        </div>
    );
}

export default ContactPage;