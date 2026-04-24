import { SPFI } from "@pnp/sp";
import { IAbsence, IAbsenceType } from "../webparts/contactFiltering/components/absences/AbsenceInterfaces";
import { IContact } from "../webparts/contactFiltering/models/IContact";
import { SP_LISTS } from "./spConstants";

export const fetchAbsencesAwaitingApproval = async (sp: SPFI, user: IContact): Promise<IAbsence[]> => {
    try {
        const results = await sp.web.lists.getByTitle(SP_LISTS.Absence).items
            .select('Id', 'Title', 
                'Employee/Id', 'Employee/Title', 
                'AbsenceType/Id', "AbsenceType/Title", 'To',
                'From', 'Notes', 'NoteForLeader', 'Delete',
                'Approved', 'Rejected', 'Approvee/Id', 'Approvee/Title', 'HoursUsed')
            .expand('Employee, Approvee, AbsenceType')
            .filter(`Approvee/Id eq ${user.Id}`)();
                
        const filteredResults = results.filter((item: IAbsence) => {
            return ((!item.Approved && !item.Delete && !item.Rejected) || (item.Delete));
        });

        return filteredResults as IAbsence[];
    } catch (exception) {
        console.error("Error fetching absences awaiting approval: ", exception);
        return [];
    }
};

export const fetchAbsences = async (sp: SPFI, contactId: number): Promise<IAbsence[]> => {
    try {
        const result = await sp.web.lists.getByTitle(SP_LISTS.Absence).items
            .select('Id', 'Title', 
                'Employee/Id', 'Employee/Title', 
                'AbsenceTypeId', 'AbsenceType/Title', 'To', 'Delete', 'Approvee/Id', 'Approvee/Title',
                'From', 'Notes', 'NoteForLeader', 'Approved', 'Rejected').expand('Employee, AbsenceType', 'Approvee').filter(`Employee/Id eq '${contactId}'`)();

        return result as IAbsence[];
    } catch (exception){
        console.error("Error fetching absences: ", exception);
        return [];
    }
}

export const fetchApprovedAbsences = async (sp: SPFI, contactId: number): Promise<IAbsence[]> => {
    try {
        const result = await sp.web.lists.getByTitle(SP_LISTS.Absence).items
            .select('Id', 'Title', 
                'Employee/Id', 'Employee/Title', 
                'AbsenceType/Id', 'AbsenceType/Title', 'To',
                'From', 'Notes', 'NoteForLeader',
                'Approved', 'Approvee/Id', 'Approvee/Title')
            .expand('Employee, Approvee, AbsenceType')
            .filter(`Employee/Id eq ${contactId} and Approved eq 1`)();

        return result as IAbsence[];
    } catch (exception){
        console.error("Error fetching approved absences: ", exception);
        return [];
    }
}

export const deleteAbsence = async (sp: SPFI, id: number): Promise<void> => {
    try {
        await sp.web.lists.getByTitle(SP_LISTS.Absence).items.getById(id).delete();
    } catch (exception) {
        console.error("Error deleting absence: ", exception);
        return;
    }
}

export const fetchAbsenceTypes = async (sp: SPFI): Promise<IAbsenceType[]> => {
    try {
        const results = sp.web.lists.getByTitle(SP_LISTS.AbsenceTypes).items
            .select("Id", "Title", "TakesPTO", "isAbsent", "FinancialStatement")();

        const absenceTypes: IAbsenceType[] = await results;

        return absenceTypes as IAbsenceType[];
    } catch (error) {
        console.error("Error fetching absence types: ", error);
        return [];
    }
}

export const fetchAllAbsences = async (sp: SPFI): Promise<IAbsence[]> => {
    try {
        const result = await sp.web.lists.getByTitle(SP_LISTS.Absence).items
            .select('Id', 'Title', 
                'Employee/Id', 'Employee/Title', 
                'AbsenceTypeId', 'AbsenceType/Title', 'To', 'From', 
                'Notes', 'NoteForLeader', 'Approved', 'Rejected',
                'FirstMonth', 'SecondMonth', 'HoursUsed').expand('Employee, AbsenceType')();

        return result as IAbsence[];
    } catch (exception){
        console.error("Error fetching all absences: ", exception);
        return [];
    }
}

export const fetchAbsencesWithFilter = async (sp: SPFI, filter?: string): Promise<IAbsence[]> => {
    try {
        let itemsQuery = sp.web.lists.getByTitle(SP_LISTS.Absence).items
            .select('Id', 'Title', 
                'Employee/Id', 'Employee/Title',
                'AbsenceType/Id', 'AbsenceType/Title', 'To',
                'From', 'Notes', 'NoteForLeader', 'Approved', 'Rejected').expand('Employee,AbsenceType');
        
        const result = filter ? await itemsQuery.filter(filter)() : await itemsQuery();
        return result as IAbsence[];
    } catch (error) {
        console.error("Error fetching absences: ", error);
        return [];
    }
}

// Additional functions needed by components:
export const addAbsence = async (sp: SPFI, absenceData: any): Promise<any> => {
    return await sp.web.lists.getByTitle(SP_LISTS.Absence).items.add(absenceData);
};

export const updateAbsence = async (sp: SPFI, absenceId: number, updateData: any): Promise<void> => {
    await sp.web.lists.getByTitle(SP_LISTS.Absence).items.getById(absenceId).update(updateData);
};
