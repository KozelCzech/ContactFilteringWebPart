import * as React from 'react';
import styles from './ContactFiltering.module.scss'; // Your SCSS styles
import { IContact } from '../models/IContact';
import { SPFI } from '@pnp/sp';
import { fetchPositionByUserId, IPosition } from '../../../services/userServices';

export interface IContactCardProps{
    sp: SPFI;
    contact: IContact;
    webAbsoluteUrl: string;
    onClick: (event: React.MouseEvent<HTMLDivElement>) => void;
}

const ContactCard: React.FC<IContactCardProps> = (props) => {
    const { sp, contact, webAbsoluteUrl, onClick } = props;
    const [ position, setPosition ] = React.useState<IPosition | undefined>(undefined);

    const listName = "ContactFilteringTest";
    const attachmentId = contact.Id;
    const attachmentName = JSON.parse(contact.Image || "").fileName;
    const attachmentUrl = `${webAbsoluteUrl}/Lists/${listName}/Attachments/${attachmentId}/${attachmentName}`;

    React.useEffect(() => {
        fetchPositionByUserId(sp, contact.Id).then(setPosition).catch(console.error);
    }, [contact, sp]);

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
            <div className={styles.subInfo}>
                {contact.PhoneNumber && <p>{contact.PhoneNumber}</p>}
                {contact.Email && <p>{contact.Email}</p>}
                {position && <p>{position.Title}</p>}
                {position?.Department && <p>{position.Department.Title}</p>}
            </div>
        </div>
    </div>
    

  );
};

export default ContactCard;