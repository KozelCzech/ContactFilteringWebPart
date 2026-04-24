import { SPFI } from "@pnp/sp";
import { SP_LISTS } from "./spConstants";

export const fetchTags = async (sp: SPFI, listName: string = SP_LISTS.Tags, filter?: string): Promise<any[]> => {
    let itemsQuery = sp.web.lists.getByTitle(listName).items;
    if (filter) {
        itemsQuery = itemsQuery.filter(filter);
    }
    return await itemsQuery();
};

export const deleteTag = async (sp: SPFI, tagId: number, listName: string = SP_LISTS.Tags): Promise<void> => {
    await sp.web.lists.getByTitle(listName).items.getById(tagId).delete();
};

export const fetchDefaultColors = async (sp: SPFI): Promise<any[]> => {
    return await sp.web.lists.getByTitle(SP_LISTS.DefaultColor).items.select("Id", "Title")();
};

export const addTag = async (sp: SPFI, tagData: any, listName: string = SP_LISTS.Tags): Promise<void> => {
    await sp.web.lists.getByTitle(listName).items.add(tagData);
};

export const updateTag = async (sp: SPFI, tagId: number, tagData: any, listName: string = SP_LISTS.Tags): Promise<void> => {
    await sp.web.lists.getByTitle(listName).items.getById(tagId).update(tagData);
};

export const getTagsUrl = (sp: SPFI, filterInput: string, top: number, listName: string = SP_LISTS.Tags): string => {
    let itemsQuery = sp.web.lists.getByTitle(listName).items;
    if (filterInput && filterInput.trim() !== "") {
        const escapedFilterText = filterInput.replace(/'/g, "''");
        const filterQueryString = `substringof('${escapedFilterText.toLowerCase()}', TagName)`;
        itemsQuery = itemsQuery.filter(filterQueryString);
    }
    return itemsQuery.select("Id", "Title", "TagName", "Comment", "tagColor").top(top).toRequestUrl();
};
