/* eslint-disable */
import { SPFI } from "@pnp/sp";
import { SP_LISTS } from "./spConstants";



export const fetchContactsWithDetails = async (sp: SPFI, selectFields: string[] = []): Promise<any[]> => {
    let query = sp.web.lists.getByTitle(SP_LISTS.ContactFilteringTest).items;
    if (selectFields && selectFields.length > 0) {
        query = query.select(...selectFields);
    }
    return await query();
};

export const fetchContactItems = async (sp: SPFI, selectFields: string[], filter?: string): Promise<any[]> => {
    let query = sp.web.lists.getByTitle(SP_LISTS.ContactFilteringTest).items;
    if (selectFields && selectFields.length > 0) {
        query = query.select(...selectFields);
    }
    if (filter) {
        query = query.filter(filter);
    }
    return await query();
};

export const fetchCurrentUser = async (sp: SPFI): Promise<any> => {
    return await sp.web.currentUser();
};

export const fetchContactByEmail = async (sp: SPFI, email: string): Promise<any[]> => {
    return await sp.web.lists.getByTitle(SP_LISTS.ContactFilteringTest).items
        .filter(`mail eq '${email}'`)();
};

export const getContactItemsUrl = (sp: SPFI, selectFields: string[], filter: string, top: number, expandFields: string[] = []): string => {
    let query = sp.web.lists.getByTitle(SP_LISTS.ContactFilteringTest).items;
    if (selectFields && selectFields.length > 0) {
        query = query.select(...selectFields);
    }
    if (expandFields && expandFields.length > 0) {
        query = query.expand(...expandFields);
    }
    if (filter) {
        query = query.filter(filter);
    }
    return query.top(top).toRequestUrl();
};
