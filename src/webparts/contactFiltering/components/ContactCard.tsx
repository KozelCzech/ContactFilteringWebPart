import * as React from 'react';
import styles from './ContactFiltering.module.scss'; // Your SCSS styles
import { IContact } from '../models/IContact';

export interface IContactCardProps{
    contact: IContact;
    webAbsoluteUrl: string;
    onClick: (event: React.MouseEvent<HTMLDivElement>) => void;
}

const ContactCard: React.FC<IContactCardProps> = (props) => {
    const { contact, webAbsoluteUrl, onClick } = props;

    const listName = "ContactFilteringTest";
    const attachmentId = contact.Id;
    const attachmentName = JSON.parse(contact.Image || "").fileName;
    const attachmentUrl = `${webAbsoluteUrl}/Lists/${listName}/Attachments/${attachmentId}/${attachmentName}`;


  return (
    <div className={styles.contactCard} onClick={onClick}>
        <div>
            <img 
                src={attachmentUrl}
                className={styles.contactImage}
            />
        </div>
        <div className={styles.contactInfo}>
            <h3>{contact.FirstName || ""}  {contact.LastName || ""}</h3>
            {contact.Department && <p>{contact.Department}</p>}
            <div className={styles.subInfo}>
                {contact.PhoneNumber && <p>{contact.PhoneNumber}</p>}
                {contact.Email && <p>{contact.Email}</p>}
                
            </div>
        </div>
    </div>
    

  );
};

export default ContactCard;