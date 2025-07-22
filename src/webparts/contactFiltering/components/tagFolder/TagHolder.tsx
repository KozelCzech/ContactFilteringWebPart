import * as React from 'react';
import styles from './Tags.module.scss'
import { useEffect, useState } from 'react';
import { SPFI } from '@pnp/sp';
import { getContrastColor } from '../../../../utils/colorUtils';
import Modal from '../subComponents/modal/Modal';
import TagEditForm from './tagEditForm/TagEditForm';
import { AddCircleFilled, DeleteFilled, EditFilled, SearchFilled } from '@fluentui/react-icons';
import { TextField } from '@fluentui/react';


export interface ITagHolderProps {
    sp: SPFI;
}


export interface ITag {
    Id: number;
    Title: string;
    TagName: string;
    Comment: string;
    tagColor: string;
}


const TagHolder: React.FC<ITagHolderProps> = (props) => {
    const listName: string = "Tags";

    const [ isLoading, setIsLoading ] = useState<boolean>(true);
    const [ tags, setTags ] = useState<ITag[]>([]);

    const [ editTag, setEditTag ] = useState<ITag | undefined>(undefined);
    const [ isModalOpen, setIsModalOpen ] = useState<boolean>(false);   
    const [ filterName, setFilterName ] = useState<string>("");
    

    const newTag: ITag = {
        Id: 0,
        Title: "NewTag",
        TagName: "",
        Comment: "",
        tagColor: "#cccccc"
    }


    const fetchTags = async (): Promise<void> => {
        setIsLoading(true);
        try {
            const tagQuery = props.sp.web.lists.getByTitle(listName).items.select(
                "Id",
                "Title",
                "TagName",
                "Comment",
                "tagColor"
            )
            const tags: ITag[] = await tagQuery();
            setTags(tags);
        } catch (error) {
            console.error("Error fetching tags:", error);
        } finally {
            setIsLoading(false);
        }
    };


    //#region Tag handling(create, delete, edit)
    const changeEditTag = async (tag: ITag): Promise<void> => {
        setIsModalOpen(true);
        setEditTag(tag);
    }


    const removeTag = async (tagId: number): Promise<void> => {

        if (!window.confirm("Are you sure you want to delete this tag?")) {
            return;
        }
        setIsLoading(true);
        try {
            await props.sp.web.lists.getByTitle(listName).items.getById(tagId).delete();

            setTags(tags.filter((tag: ITag) => tag.Id !== tagId));
            setIsLoading(false);
        } catch (error) {
            console.log("Error removing tag: ", error);
            setIsLoading(false);
        }
    };


    const onModalClose = async (): Promise<void> => {
        setIsModalOpen(false);
        setEditTag(undefined);
    }

    const onTagSaved = async (savedTag: ITag): Promise<void> => {
        setIsLoading(true);
        const tagExists = tags.some(t => t.Id === savedTag.Id);

        if (tagExists) {
            setTags(tags.map(t => t.Id === savedTag.Id ? savedTag : t));
        } else {
            setTags([...tags, savedTag]);
        }

        setIsModalOpen(false);
        setEditTag(undefined);
        setIsLoading(false);

        fetchTags().catch(console.error);
    }
    //#endregion
    

    //#region Search
        const onFilteredNameChange = (ev: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string): void => {
            setFilterName(newValue || "");
        }




    //#endregion


    useEffect(() => {
        fetchTags().catch(console.error);
    }, []);

    return (
        <div>
            {isLoading ? (
                <p>Loading tags...</p>
            ) : (
                <div>
                    <div className={styles.tagControlsContainer}>
                        <div className={styles.searchForm}>
                            <button title="Search Tags" type="submit" className={styles.searchButton}><SearchFilled /></button>
                            <TextField placeholder="Search tags" onChange={onFilteredNameChange}/> 
                            <p>{filterName}</p>
                        </div>
                        <button className={styles.addButton} title="Add Tag" onClick={() => changeEditTag(newTag)}><AddCircleFilled /></button>
                    </div>
                    <div className={styles.tagsContainer}>
                        {tags.map((tag: ITag) => 
                            <div key={tag.Id} className={styles.tag}>
                                <div className={styles.tagNameHolder}>
                                    <p className={styles.tagName}
                                    style={{
                                        backgroundColor: tag.tagColor,
                                        color: getContrastColor(tag.tagColor)   
                                    }}>
                                        {tag.TagName}
                                    </p>
                                </div>
                                <p className={styles.tagComment}>{tag.Comment}</p>
                                <div className={styles.tagButton}>
                                    <button title="Edit Tag" onClick={() => changeEditTag(tag)}><EditFilled /></button>
                                    <button title="Delete Tag" onClick={() => removeTag(tag.Id)}><DeleteFilled /></ button>
                                </div>
                            </div>
                        )}
                    </div>
                    <Modal title={editTag?.Id === 0 ? "Add New Tag" : "Edit Tag"} onClose={onModalClose} isOpen={isModalOpen}>
                        { editTag && <TagEditForm sp={props.sp} tag={editTag} onTagSaved={onTagSaved}/>}
                    </Modal>
                </div>
            )}
        </div>
    );
}

export default TagHolder;