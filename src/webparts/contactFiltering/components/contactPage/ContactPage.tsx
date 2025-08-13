import * as React from 'react';
import styles from './ContactPage.module.scss'; // Your SCSS styles
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/items";
import { IContact } from '../../models/IContact';
import { ITag } from '../tagFolder/TagHolder';
import { useEffect, useState } from 'react';
import { SPFI } from '@pnp/sp';
import { ComboBox, IComboBox, IComboBoxOption, Spinner } from '@fluentui/react';
import { getContrastColor } from '../../../../utils/colorUtils';
import { DismissFilled } from '@fluentui/react-icons';


export interface IContactPageProps {
    contact: IContact;
    webAbsoluteUrl: string;
    sp: SPFI;
    onUpdate: () => void;
}


const ContactPage: React.FC<IContactPageProps> = (props) => {
    const { sp, contact, webAbsoluteUrl, onUpdate } = props;
    const [ tags, setTags ] = useState<ITag[]>([]);
    const [ tagsLoading, setTagsLoading ] = useState<boolean>(false);
    const [ allTags, setAllTags ] = useState<ITag[]>([]);

    const [ options, setOptions ] = useState<IComboBoxOption[]>([]);
    const [ selectedKey, setSelectedKey ] = useState<string | number | undefined>(undefined);




    const listName = "ContactFilteringTest";
    const attachmentId = contact.Id;
    const attachmentName = JSON.parse(contact.Image || "").fileName;
    const attachmentUrl = `${webAbsoluteUrl}/Lists/${listName}/Attachments/${attachmentId}/${attachmentName}`;


    const fetchOptions = async (fetchedTags: ITag[]): Promise<void> => {
        try {
            const result = await sp.web.lists.getByTitle('Tags').items.select('Id', 'TagName')();

            const options: IComboBoxOption[] = result.map((item: ITag) => {
                const disabled = fetchedTags.some((tag: ITag) => tag.Id === item.Id);
                return { key: item.Id, text: item.TagName, disabled: disabled };
            });

            setOptions(options);
        } catch (error) {
            console.error("Error fetching options: ", error);
        }
    }


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
            setAllTags(fetchedTags);

            fetchOptions(fetchedTags).catch(error => {
                console.error("Error fetching options: ", error);
            });
        } catch (error) {
            console.error("Error fetching tags: ", error);
        } finally {
            setTagsLoading(false);
        }
    
    };    


    const addTag = async (): Promise<void> => {
        try {
            const result = await sp.web.lists.getByTitle('Tags').items
            .select('Id', 'Title', 'TagName', 'Comment', 'tagColor').getById(selectedKey as number)();
            
            setTags(currentTags => [...currentTags, result as ITag]);

        } catch (error) {
            console.error("Error adding tag: ", error);
        }
    }


    const removeTag = async (tag: ITag): Promise<void> => {
        try {
            const newTags = tags.filter((t: ITag) => t.Id !== tag.Id);
            setTags(newTags);
        } catch (error) {
            console.error("Error removing tag: ", error);
        }
    }


    const saveChanges = async (): Promise<void> => {
        try {
            const tagIds: number[] = tags.map((tag: ITag) => tag.Id);
            console.log(tags.length)

            const editedContact = {
                Id: contact.Id,
                Title: contact.Title,
                FirstName: contact.FirstName,
                LastName: contact.LastName,
                Department: contact.Department,
                Image: contact.Image,
                PhoneNumber: contact.PhoneNumber,
                Email: contact.Email,
                TagsId: tagIds
            }

            await sp.web.lists.getByTitle('ContactFilteringTest').items.getById(contact.Id).update(editedContact);

            setSelectedKey(undefined);

            onUpdate();
        } catch (error) {
            console.error("Error saving changes: ", error);
        }
    }


    const cancelChanges = async (): Promise<void> => {
        setTags(allTags);
    }


    const onSelectChange = (event: React.FormEvent<IComboBox>, option?: IComboBoxOption): void => {
        setSelectedKey(option?.key);
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
                    <>
                        <div>
                            <ComboBox
                                className={styles.comboBoxContainer}
                                autoComplete='on'
                                allowFreeInput
                                dropdownMaxWidth={300}
                                options={options}
                                selectedKey={selectedKey} 
                                onChange={onSelectChange}
                            /> 
                            <button onClick={addTag}>+</button>
                        </div>
                        {tags.map((tag: ITag) => (
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
                                    <button onClick={() => removeTag(tag)}>
                                        <DismissFilled />
                                    </button>
                                </ div>
                            </div>
                            
                        ))}
                    </>
                }
            </div>
            <div>
                <button onClick={saveChanges}>Save Changes</button>
                <button onClick={cancelChanges}>Cancel Changes</button>
            </div>
        </div>
    );
}

export default ContactPage;