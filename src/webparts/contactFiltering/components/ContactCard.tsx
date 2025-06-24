import * as React from 'react';
import type { IContactCardProps } from './IContactCardProps';
import styles from './ContactFiltering.module.scss'; // Your SCSS styles

const ContactCard: React.FC<IContactCardProps> = (props) => {
    const { contact, webAbsoluteUrl } = props;

    const listName = "ContactFilteringTest";
    const attachmentId = contact.Id;
    const attachmentName = JSON.parse(contact.Image || "").fileName;
    const attachmentUrl = `${webAbsoluteUrl}/Lists/${listName}/Attachments/${attachmentId}/${attachmentName}`;


  return (
    <div className={styles.contactCard}>
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