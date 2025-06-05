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
        <div className={styles.cardHeader}>
            <h3>{contact.FirstName || ""}  {contact.LastName || ""}</h3>
        </div>
        <div className={styles.cardBody}>
            <img 
                src={attachmentUrl}
                className={styles.contactImage}
            />
            {contact.Department && <p><strong>Department:</strong> {contact.Department}</p>}
        </div>
        <div className={styles.cardFooter}>
            <p>ID: {contact.Id}</p>
        </div>
    </div>
    

  );
};

export default ContactCard;