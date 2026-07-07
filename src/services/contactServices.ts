/* eslint-disable */
import { SPFI } from "@pnp/sp";
import { SP_LISTS } from "./spConstants";

export const fetchContactsWithDetails = async (sp: SPFI, selectFields: string[] = ["Id", "Leader/Id", "Leader/Title", "Title", "FirstName", "LastName", "Email", "Role", "Image", "Tags", "MobileNumber", "JobTitle", "PersonalNumber"]): Promise<any[]> => {
    return await sp.web.lists.getByTitle(SP_LISTS.ContactFilteringTest).items
        .select(...selectFields)
        .expand('Leader')();
};

export const fetchContactItems = async (sp: SPFI, selectFields: string[], filter?: string): Promise<any[]> => {
    let query = sp.web.lists.getByTitle(SP_LISTS.ContactFilteringTest).items.select(...selectFields);
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
        .select(
            'Id', 'Title', 'FirstName', 'LastName', 'Image', 'PhoneNumber', 'Email', 
            "Leader/ID", "Leader/Title", "BackupLeader/ID", "BackupLeader/Title", "TimeOffHours"
        ).expand("Leader", "BackupLeader")
        .filter(`Email eq '${email}'`)();
};

export const getContactItemsUrl = (sp: SPFI, selectFields: string[], filter: string, top: number, expandFields: string[]): string => {
    let query = sp.web.lists.getByTitle(SP_LISTS.ContactFilteringTest).items.select(...selectFields);
    if (expandFields && expandFields.length > 0) {
        query = query.expand(...expandFields);
    }
    if (filter) {
        query = query.filter(filter);
    }
    return query.top(top).toRequestUrl();
};
