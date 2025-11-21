import { SPFI } from "@pnp/sp";
import { IContact } from "../webparts/contactFiltering/models/IContact";
import { IAbsence } from "../webparts/contactFiltering/components/absences/AbsenceInterfaces";


export interface IDepartment {
    Id: number;
    Title: string;
    Location: string;
    Leader: IContact;
}


export interface IPosition {
    Id: number;
    Title: string;
    Department: IDepartment;
}


export interface ICommitment {
    Id: number;
    Title: string;
    Employee: IContact;
    Position: IPosition;
    From: Date;
    To?: Date;
    MainCommitment: boolean;
    WorkHoursPerDay: number;
}


export const fetchUserWorkHours = async (sp: SPFI, userId: number): Promise<number> => {
    try {
        const results = await sp.web.lists.getByTitle('Uvazky').items
            .select(
                "Id", "Title", "WorkHoursPerDay", "MainCommitment", "From", "To",
                "Employee/Id", "Employee/Title",
                "Position/Id", "Position/Title"
            )
            .expand("Employee", "Position")
            .filter(`Employee/Id eq ${userId}`)();

        const allCommitments = results as ICommitment[];
        const today = new Date();
        const activeCommitment = allCommitments.find(c => new Date(c.From) <= today && (!c.To || new Date(c.To) >= today) && c.MainCommitment === true);
        return activeCommitment?.WorkHoursPerDay || 8; // Fallback to 8 hours if not found

    } catch (exception) {
        console.error("Error fetching user work hours: ", exception);
        return 0;
    }
}


export const fetchUserById = async (sp: SPFI, userId: number): Promise<IContact> => {
    try {
        const results = await sp.web.lists.getByTitle('ContactFilteringTest').items
            .select('Id', 'Title', 'FirstName', 'LastName').getById(userId)();

        return results as IContact;
    } catch (exception) {
        console.error("Error fetching user by ID: ", exception);
        return {Id: 0, Title: ''};
    }
}


export const fetchMainCommitment = async (sp: SPFI, userId: number): Promise<ICommitment> => {
    const result = await sp.web.lists.getByTitle('Uvazky').items
        .select('Id', 'Title', 'Employee/Id', 'Employee/Title', 'Position/Id', 'Position/Title', 'MainCommitment')
        .expand('Employee', 'Position')
        .filter(`Employee/Id eq ${userId}`)();

    const commitments: ICommitment[] = result as ICommitment[]
    return commitments.find(commitment => commitment.MainCommitment) || commitments[0];
}


export const fetchPositionByUserId = async (sp: SPFI, userId: number): Promise<IPosition | undefined> => {
    const commitment = await fetchMainCommitment(sp, userId);
    if (!commitment?.Position?.Id) return undefined;

    try {
        const result = await sp.web.lists.getByTitle('Pozice').items.getById(commitment.Position.Id)
            .select('Id', 'Title', 'Department/Id', 'Department/Title')
            .expand('Department')();
            
        return result as IPosition;
    } catch (error) {
        console.error(`Error fetching position for user ID ${userId}:`, error);
        return undefined;
    }
}

export const fetchDepartmentByUserId = async (sp: SPFI, userId: number): Promise<IDepartment | undefined> => {
    const position = await fetchPositionByUserId(sp, userId);
    if (!position?.Department?.Id) return undefined;
    try {
        const result = await sp.web.lists.getByTitle("Oddeleni").items
            .select('Id', 'Title', 'Location', 'Leader/Id', 'Leader/Title').expand('Leader')
            .getById(position.Department.Id)();
        return result as IDepartment;
    } catch (error) {
        console.error(`Error fetching department for user ID ${userId}:`, error);
        return undefined;
    }
}

export const getLeaderInfo = async (sp: SPFI, user: IContact): Promise<IContact> => {
    const department = await fetchDepartmentByUserId(sp, user.Id);
    return department?.Leader || { Id: 0, Title: '' };
}


export const fetchAbsencesAwaitingApproval = async (sp: SPFI, user: IContact): Promise<IAbsence[]> => {
        try {
            const results = await sp.web.lists.getByTitle('Absence').items
                .select('Id', 'Title', 
                    'Employee/Id', 'Employee/Title', 
                    'AbsenceType/Id', "AbsenceType/Title", 'To',
                    'From', 'Notes', 'NoteForLeader',
                    'Approved', 'Approvee/Id', 'Approvee/Title', 'HoursUsed')
                .expand('Employee, Approvee, AbsenceType')
                .filter('Approved eq false and Approvee/Id eq ' + user.Id)();
                    
            return results as IAbsence[];
        } catch (exception) {
            console.error("Error fetching absences awaiting approval: ", exception);
            return [];
        }
    };

export const fetchAbsences = async (sp: SPFI, contact: IContact): Promise<IAbsence[]> => {
        try {
            const result = await sp.web.lists.getByTitle('Absence').items
                .select('Id', 'Title', 
                    'Employee/Id', 'Employee/Title', 
                    'AbsenceTypeId', 'AbsenceType/Title', 'To',
                    'From', 'Notes', 'NoteForLeader', 'Approved').expand('Employee, AbsenceType').filter(`Employee/Id eq '${contact.Id}'`)();
    
            return result as IAbsence[];
        } catch (exception){
            console.error("Error fetching absences: ", exception);
            return [];
        }
    }