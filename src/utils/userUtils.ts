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
    MainCommitment: boolean;
}


const fetchMainCommitment = async (sp: SPFI, userId: number): Promise<ICommitment> => {
    const result = await sp.web.lists.getByTitle('Uvazky').items
        .select('Id', 'Title', 'Employee/Id', 'Employee/Title', 'Position/Id', 'Position/Title', 'MainCommitment')
        .expand('Employee', 'Position')
        .filter(`Employee/Id eq ${userId}`)();

    const commitments: ICommitment[] = result as ICommitment[]
    return commitments.find(commitment => commitment.MainCommitment) || commitments[0];
}


const fetchPosition = async (sp: SPFI, positionId: number): Promise<IPosition> => {
    const result = await sp.web.lists.getByTitle('Pozice').items
        .select('Id', 'Title', 'Department/Id', 'Department/Title').expand('Department')
        .filter('Id eq ' + positionId)();
    return result[0] as IPosition;
}

const fetchDepartment = async (sp: SPFI, departmentId: number): Promise<IDepartment> => {
    const result = await sp.web.lists.getByTitle("Oddeleni").items
        .select('Id', 'Title', 'Location', 'Leader/Id', 'Leader/Title').expand('Leader')
        .filter('Id eq ' + departmentId)();
    return result[0] as IDepartment;
}

export const getLeaderInfo = async (sp: SPFI, user: IContact): Promise<IContact> => {
    const commitment = await fetchMainCommitment(sp, user.Id);
    if (!commitment?.Position?.Id) return {Id: 0, Title: ''};

    const position = await fetchPosition(sp, commitment.Position.Id);
    if (!position?.Department?.Id) return {Id: 0, Title: ''};

    const department = await fetchDepartment(sp, position.Department.Id);
    return department?.Leader;
}


export const fetchAbsencesAwaitingApproval = async (sp: SPFI, user: IContact): Promise<IAbsence[]> => {
        try {
            const results = await sp.web.lists.getByTitle('Absence').items
                .select('Id', 'Title', 
                    'Employee/Id', 'Employee/Title', 
                    'AbsenceType', 'To',
                    'From', 'Notes', 'NoteForLeader',
                    'Approved', 'Approvee/Id', 'Approvee/Title')
                .expand('Employee, Approvee')
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
                    'AbsenceType', 'To',
                    'From', 'Notes', 'NoteForLeader', 'Approved').expand('Employee').filter(`Employee/Id eq '${contact.Id}'`)();
    
            return result as IAbsence[];
        } catch (exception){
            console.error("Error fetching absences: ", exception);
            return [];
        }
    }