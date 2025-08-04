import * as React from 'react';
import styles from './Tags.module.scss'
import { useCallback, useEffect, useState } from 'react';
import { SPFI } from '@pnp/sp';
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/items";
import { getContrastColor } from '../../../../utils/colorUtils';
import Modal from '../subComponents/modal/Modal';
import TagEditForm from './tagEditForm/TagEditForm';
import { AddCircleFilled, DeleteFilled, EditFilled, SearchFilled } from '@fluentui/react-icons';
import { TextField } from '@fluentui/react';
import Paginator from '../subComponents/paginator/Paginator';
import { IItems } from '@pnp/sp/items';


export interface ITagHolderProps {
    sp: SPFI;
    webUrl: string;
}


export interface ITag {
    Id: number;
    Title: string;
    TagName: string;
    Comment: string;
    tagColor: string;
}


export interface ITagState {
    tags: ITag[];
    isLoading: boolean;
    hasNext: boolean;
    pageUrls: string[];
    currentPageNumber: number;
    itemsPerPage: number;
    filterInput: string;
    activeFilter: string;
    editTag?: ITag;
    isModalOpen: boolean;
}



const TagHolder: React.FC<ITagHolderProps> = (props) => {
    const listName: string = "Tags";
    
    const [state, setState] = useState<ITagState>({
        tags: [],
        isLoading: true,
        hasNext: false,
        pageUrls: [],
        currentPageNumber: 0,
        itemsPerPage: 10,
        filterInput: "",
        activeFilter: "",
        isModalOpen: false,
        editTag: undefined,
    });

    const newTag: ITag = {
        Id: 0,
        Title: "NewTag",
        TagName: "",
        Comment: "",
        tagColor: "#cccccc"
    }


    const createFilteredQuery = (): IItems => {
        let itemsQuery = props.sp.web.lists.getByTitle(listName).items;
        if (state.activeFilter && state.activeFilter.trim() !== "") {
            const escapedFilterText = state.activeFilter.replace(/'/g, "''");
            const filterQueryString = `substringof('${escapedFilterText.toLowerCase()}', TagName)`;
            itemsQuery = itemsQuery.filter(filterQueryString);
        }
        return itemsQuery.select(
            "Id",
            "Title",
            "TagName",
            "Comment",
            "tagColor"
        ).top(state.itemsPerPage);
    }


    const loadPageByUrl = useCallback(async (url: string) => {
        setState(s => ({ ...s, isLoading: true }));

        

        try {
            const response = await fetch(url, {
                headers: { Accept: "application/json;odata=verbose"}
            });

            if (response.ok) {
                const data = await response.json();
                const newItems = data.d.results as ITag[];
                const nextUrl = data.d.__next;

                setState(s => {
                    const newUrls = [...s.pageUrls];

                    if (nextUrl && !newUrls.includes(nextUrl)) {
                        newUrls[s.currentPageNumber + 1] = nextUrl;
                    } return {
                        ...s,
                        tags: newItems,
                        hasNext: !!nextUrl, // `hasNext` is true if nextUrl exists.
                        pageUrls: newUrls,
                        isLoading: false,
                    };
                });
            } else {
                throw new Error(`Error fetching data: ${response.statusText}`);
            }
        } catch ( error ) {
            console.log("Error loading page: ", error);
        } finally {
            setState(s => ({ ...s, isLoading: false }));
        }
    }, [props.sp]);
    

    const getFirstPage = async ():Promise<void> => {
        setState(s => ({ ...s, isLoading: true }));
        const initialQuery = createFilteredQuery();
        const initialUrl = initialQuery.toRequestUrl();

        const cleanedUrl = `${props.webUrl}/${initialUrl}`;

        setState(s => ({
            ...s,
            pageUrls: [cleanedUrl],
            currentPageNumber: 0,
            tags: []
        }));

        await loadPageByUrl(cleanedUrl);
    }


    const handleNext = (): void => {
        if (state.hasNext) {
            setState(s => ({ ...s, currentPageNumber: s.currentPageNumber + 1 }));
        }
    }


    const handlePrevious = (): void => {
        if (state.currentPageNumber > 0) {
            setState(s => ({ ...s, currentPageNumber: s.currentPageNumber - 1}));
        }
    }


    /*
    const refreshCurrentPage = async (): Promise<void> => {
        if (!state.currentPageQuery) {
            await getFirstPage();
            return;
        }

        setState(s => ({ ...s, isLoading: true }));
        try {
            const result: { results: ITag[], hasNext: boolean } = await state.currentPageQuery();
            if (result.results.length === 0 && state.pageHistory.length > 0){
                await getPreviousPage();
            } else {
                setState(s => ({
                    ...s,
                    tags: result.results,
                    hasNext: result.hasNext,
                    isLoading: false
                }));
            }
        } catch (error) {
            console.log("Error refreshing current page: ", error);
            setState(s => ({ ...s, isLoading: false }));
        }
    }
    */


    //#region Tag handling(create, delete, edit)
    const changeEditTag = async (tag: ITag): Promise<void> => {
        setState(s => ({ ...s, editTag: tag, isModalOpen: true}));
    }


    const removeTag = async (tagId: number): Promise<void> => {

        if (!window.confirm("Are you sure you want to delete this tag?")) {
            return;
        }

        try {
            await props.sp.web.lists.getByTitle(listName).items.getById(tagId).delete();

            await loadPageByUrl(state.pageUrls[state.currentPageNumber]);
        } catch (error) {
            console.log("Error removing tag: ", error);
        }
    };


    const onModalClose = async (): Promise<void> => {
        setState(s => ({ ...s, isModalOpen: false, editTag: undefined}));
    }

    const onTagSaved = async (savedTag: ITag): Promise<void> => {
        setState(s => ({ ...s, isModalOpen: false, editTag: undefined}));
    
        await loadPageByUrl(state.pageUrls[state.currentPageNumber]);
    }
    //#endregion
    

    //#region Search
    const onFilteredNameChange = (ev: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string): void => {
        setState(s => ({ ...s, filterInput: newValue || ""}));
    };

    const handleSearch = (event: React.FormEvent): void => {
        event.preventDefault();
        setState(s => ({ ...s, activeFilter: s.filterInput}));
    };
    //#endregion


    useEffect(() => {
        getFirstPage().catch(error => {
            console.log("Error getting first page: ", error);
        });
    }, [state.activeFilter]);

    useEffect(() => {
        if (state.currentPageNumber > 0 || (state.currentPageNumber === 0 && state.activeFilter === state.filterInput)) {
            const urlToLoad = state.pageUrls[state.currentPageNumber];
            if (urlToLoad) {
                loadPageByUrl(urlToLoad).catch(error => {
                    console.log("Error loading page: ", error);
                });
            }
        }
    }, [state.currentPageNumber]);

    return (
        <div>
            {state.isLoading ? (
                <p>Loading tags...</p>
            ) : (
                <div>
                    <div className={styles.tagControlsContainer}>
                        <div className={styles.searchForm}>
                            <button 
                            title="Search Tags"    
                            type="submit" 
                            className={styles.searchButton} 
                            onClick={handleSearch}>
                                <SearchFilled />
                            </button>
                            <TextField placeholder="Search tags" onChange={onFilteredNameChange} value={state.filterInput}/> 
                        </div>
                        <button className={styles.addButton} title="Add Tag" onClick={() => changeEditTag(newTag)}><AddCircleFilled /></button>
                    </div>
                    <div className={styles.tagsContainer}>
                        <Paginator 
                            hasNext={state.hasNext} 
                            hasPrevious={state.currentPageNumber > 0} 
                            currentPageNumber={state.currentPageNumber}
                            handleNext={handleNext}
                            handlePrevious={handlePrevious}
                            >
                            {state.tags && state.tags.map((tag: ITag) => 
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
                        </Paginator>
                    </div>
                    <Modal title={state.editTag?.Id === 0 ? "Add New Tag" : "Edit Tag"} onClose={onModalClose} isOpen={state.isModalOpen}>
                        { state.editTag && <TagEditForm sp={props.sp} tag={state.editTag} onTagSaved={onTagSaved}/>}
                    </Modal>
                </div>
            )}
        </div>
    );
}

export default TagHolder;