import * as React from 'react';
import styles from './ContactPage.module.scss'; // Your SCSS styles
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/items";
import { IContact } from '../../models/IContact';
import { ITag } from '../tagFolder/TagHolder';
import { useEffect, useState } from 'react';
import { SPFI } from '@pnp/sp';
import { Spinner } from '@fluentui/react';
import { getContrastColor } from '../../../../utils/colorUtils';
import { DismissFilled } from '@fluentui/react-icons';


export interface IContactPageProps {
    contact: IContact;
    webAbsoluteUrl: string;
    sp: SPFI;
}


const ContactPage: React.FC<IContactPageProps> = (props) => {
    const { sp, contact, webAbsoluteUrl } = props;
    const [ tags, setTags ] = useState<ITag[]>([]);
    const [ tagsLoading, setTagsLoading ] = useState<boolean>(false);

    const listName = "ContactFilteringTest";
    const attachmentId = contact.Id;
    const attachmentName = JSON.parse(contact.Image || "").fileName;
    const attachmentUrl = `${webAbsoluteUrl}/Lists/${listName}/Attachments/${attachmentId}/${attachmentName}`;


    const fetchTags = async (): Promise<void> => {
        setTagsLoading(true);
        const IDArray: number[] = [];
        
        try {
            contact.Tags.results.forEach((tag: ITag) => {
                IDArray.push(tag.Id);
            });
    
            const tagPromises = IDArray.map((id: number) => {
                return sp.web.lists.getByTitle('Tags').items
                .select('Id', 'Title', 'TagName', 'Comment', 'tagColor').getById(id)();
            });
        
            const fetchedTags = await Promise.all(tagPromises);
    
            setTags(fetchedTags);
        } catch (error) {
            console.log("Error fetching tags: ", error);
        } finally {
            setTagsLoading(false);
        }
    
    };

    useEffect(() => {
        fetchTags().catch(error => {
            console.log("Error fetching tags: ", error);
        });
    }, [])

    

    return (
        <div>
            <div>
                <img
                    src={attachmentUrl}
                    className={styles.contactImage}
                />
            </div>

            <h3>{contact.FirstName || ""}  {contact.LastName || ""}</h3>
            {contact.Department && <p>{contact.Department}</p>}
            {tags.length > 0 && <p>Tags:</p>}
            <div className={styles.tagHolder}>
                {tagsLoading ? 
                    <Spinner label="Loading tags..." /> 
                    : 
                    tags.map((tag: ITag) => (
                        <div key={tag.Id}>
                            <div 
                                className={styles.tag}
                                style={{
                                        backgroundColor: tag.tagColor,
                                        color: getContrastColor(tag.tagColor)
                            }}>
                                <p 
                                    className={styles.tagName}
                                    title={tag.Comment ? tag.Comment : tag.TagName}
                                    >
                                    {tag.TagName}
                                </p>
                                <button>
                                    <DismissFilled />
                                </button>
                            </ div>
                        </div>
                ))}
            </div>
        </div>
    );
}

export default ContactPage;