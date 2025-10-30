import * as React from 'react';
import styles from './ContactPage.module.scss'; // Your SCSS styles
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/items";
import { IContact } from '../../models/IContact';
import { ITag } from '../tagFolder/TagHolder';
import { useEffect, useState } from 'react';
import { SPFI } from '@pnp/sp';
import { ComboBox, ConstrainMode, DefaultButton, DetailsList, DetailsListLayoutMode, IColumn, IComboBox, IComboBoxOption, PivotItem, PrimaryButton, SelectionMode, Spinner } from '@fluentui/react';
import { getContrastColor } from '../../../../utils/colorUtils';import { CheckmarkFilled, DismissFilled } from '@fluentui/react-icons';
import { IAbsence } from '../absences/AbsenceInterfaces';
import { formatDate } from '../../../../utils/dateUtils';
import TabsView from '../subComponents/tabsView/tabsView';


export interface IContactPageProps {
    contact: IContact;
    webAbsoluteUrl: string;
    sp: SPFI;
    isTagCreator: boolean;
    onUpdate: () => void;
}


const ContactPage: React.FC<IContactPageProps> = (props) => {
    const { sp, contact, webAbsoluteUrl, isTagCreator, onUpdate } = props;
    const [ tags, setTags ] = useState<ITag[]>([]);
    const [ tagsLoading, setTagsLoading ] = useState<boolean>(false);
    const [ allTags, setAllTags ] = useState<ITag[]>([]);

    const [ options, setOptions ] = useState<IComboBoxOption[]>([]);
    const [ selectedKey, setSelectedKey ] = useState<string | number | undefined>(undefined);
    const [ comboBoxText, setComboBoxText ] = useState<string>('');

    const [ absences, setAbsences ] = useState<IAbsence[]>([]);



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


    const fetchAbsences = async (): Promise<void> => {
        try {
            const result = await sp.web.lists.getByTitle('Absence').items
                .select('Id', 'Title', 
                    'Employee/Id', 'Employee/Title', 
                    'AbsenceType', 'To',
                    'From', 'Notes', 'Approved').expand('Employee').filter(`Employee/Id eq '${contact.Id}'`)();
    
            setAbsences(result as IAbsence[]);
        } catch (exception){
            console.error("Error fetching absences: ", exception);
        }
    }


    // #region Tags
    const fetchTags = async (): Promise<void> => {
        setTagsLoading(true);
        const IDArray: number[] = [];
        
        try {            
            contact.Tags?.forEach((tag: ITag) => {
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
            fetchAbsences().catch(error => {
                console.error("Error fetching absences: ", error);
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
            
            setOptions(prevOptions => {
                const newOptions = prevOptions.map(option => {
                    if (option.key === selectedKey) {
                        return { ...option, disabled: true };
                    }
                    return option;
                });
                return newOptions;
            });

            setTags(currentTags => [...currentTags, result as ITag]);
            setSelectedKey(undefined);
            setComboBoxText('');
        } catch (error) {
            console.error("Error adding tag: ", error);
        }
    }


    const removeTag = async (tag: ITag): Promise<void> => {
        try {
            const newTags = tags.filter((t: ITag) => t.Id !== tag.Id);

            setOptions(prevOptions => {
                const newOptions = prevOptions.map(option => {
                    if (option.key === tag.Id) {
                        return { ...option, disabled: false };
                    }
                    return option;
                });
                return newOptions;
            });
            
            setTags(newTags);
        } catch (error) {
            console.error("Error removing tag: ", error);
        }
    }
    // #endregion


    // #region ListChanges
    const saveChanges = async (): Promise<void> => {
        try {
            const tagIds: number[] = tags.map((tag: ITag) => tag.Id);

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
    // #endregion

    const onSelectChange = (event: React.FormEvent<IComboBox>, option?: IComboBoxOption, index?: number, value?: string): void => {
        if (option) {
            setSelectedKey(option.key);
            setComboBoxText(option.text);
        } else {
            setSelectedKey(undefined);
            setComboBoxText(value as string);
        }
    };


    useEffect(() => {
        fetchTags().catch(error => {
            console.log("Error fetching tags: ", error);
        });
        
    }, [])


    const columns: IColumn[] = [
        {
            key: 'type', name: 'Typ', fieldName: 'AbsenceType', minWidth: 80, isResizable: true,
        },
        {
            key: 'from', name: 'Od', fieldName: 'From', minWidth: 65, isResizable: true,
            // 2. Use onRender to format the date cell
            onRender: (item: IAbsence) => <span>{formatDate(item.From.toString())}</span>,
        },
        {
            key: 'to', name: 'Do', fieldName: 'To', minWidth: 65, isResizable: true,
            onRender: (item: IAbsence) => <span>{formatDate(item.To.toString())}</span>,
        },
        {
            key: 'notes', name: 'Poznámka', fieldName: 'Notes', minWidth: 200, isResizable: true,
        },
        {
            key: 'status', name: 'Potvrzeno', fieldName: 'Approved', minWidth: 90, isResizable: true,
            // 3. Use onRender to create a modern status badge
            onRender: (item: IAbsence) => (
                <span className={item.Approved ? styles.statusApproved : styles.statusPending}>
                    {item.Approved ? <CheckmarkFilled title="Approved" /> : <DismissFilled title="Pending" />}
                </span>
            ),
        },
    ];

    

    return (
        <div className={styles.contactPage}>
            <div className={styles.header}>
                <img
                    src={attachmentUrl}
                    className={styles.contactImage}
                />
                <div className={styles.headerText}>
                    <h3>{contact.FirstName || ""}  {contact.LastName || ""}</h3>
                    {contact.Department && <p>{contact.Department}</p>}
                </div>
            </div>
            <div className={styles.content}>
                <div className={styles.contactDetails}>
                    <h4>Contact Details</h4>
                    <p>Phone Number: {contact.PhoneNumber}</p>
                    <p>Email: {contact.Email}</p>
                </div>
                    <TabsView>
                        <PivotItem headerText='Tags' itemKey='tags'>
                        <div className={styles.tagsSection}>
                            <h4>Tags</h4>
                            <div className={styles.tagHolder}>
                                {tagsLoading ?
                                    <Spinner label="Loading tags..." />
                                    :
                                    <div className={styles.tagSection}>
                                        { isTagCreator && <div className={styles.addTagContainer}>
                                            <ComboBox
                                                className={styles.comboBoxContainer}
                                                autoComplete='on'
                                                allowFreeInput
                                                dropdownMaxWidth={300}
                                                options={options}
                                                selectedKey={selectedKey}
                                                onChange={onSelectChange}
                                                text={comboBoxText}
                                            />
                                            <button onClick={addTag} className={styles.addButton} disabled={!selectedKey}>+</button>
                                        </div>}
                                        <div className={styles.tagList}>
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
                                                        { isTagCreator && <button onClick={() => removeTag(tag)}>
                                                            <DismissFilled />
                                                        </button>}
                                                    </ div>
                                                </div>
                                            ))}
                                        </div>
                                    </ div>
                                }
                            </div>
                            { isTagCreator &&<div className={styles.footer}>
                                <PrimaryButton text="Save Changes" onClick={saveChanges} style={{ marginRight: '8px' }} />
                                <DefaultButton text="Revert Changes" onClick={cancelChanges} />
                            </div>}
                        </div>
                        </ PivotItem>
                        <PivotItem headerText='Absences' itemKey='absences'>
                            <DetailsList
                                items={absences}
                                columns={columns}
                                setKey="set"
                                layoutMode={DetailsListLayoutMode.justified} // 2. Change to fixedColumns
                                constrainMode={ConstrainMode.horizontalConstrained}
                                selectionMode={SelectionMode.none} // Or SelectionMode.single, etc.
                                isHeaderVisible={true} 
                                compact={true}/>
                        </PivotItem>
                    </TabsView>
                </div>
            
        </div>
    );
}

export default ContactPage;