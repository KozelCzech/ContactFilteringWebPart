import { SPFI } from "@pnp/sp";
import { IContact } from "../webparts/contactFiltering/models/IContact";
import { IAbsence } from "../webparts/contactFiltering/components/absences/AbsenceInterfaces";


export interface IDepartment {
    Id: number;
    Title: string;
    UniqueCode: number;
    Location: string;
    Leader: IContact;
    LeaderDepartment?: IDepartment;
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
        const results = await sp.web.lists.getByTitle('ContactFilteringTest').items.getById(userId)
            .select('Id', 'Title', 'FirstName', 'Email', 'LastName', 'Leader/Id', 'Leader/Title').expand('Leader')();

        return results as IContact;
    } catch (exception) {
        console.error("Error fetching user by ID: ", exception);
        return {Id: 0, Title: ''};
    }
}


export const fetchAllUsers = async (sp: SPFI ): Promise<IContact[]> => {
    try {
        const results = await sp.web.lists.getByTitle('ContactFilteringTest').items
            .select('Id', 'Title', 'FirstName', 'LastName')();

        return results as IContact[];
    } catch (exception) {
        console.error("Error fetching all users: ", exception);
        return [];
    }
}


export const fetchMainCommitment = async (sp: SPFI, userId: number): Promise<ICommitment> => {
    const result = await sp.web.lists.getByTitle('Uvazky').items
        .select('Id', 'Title', 'Employee/Id', 'Employee/Title', 'Position/Id', 'Position/Title',
             'MainCommitment', 'From', 'To', 'WorkHoursPerDay')
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
            .getById(position.Department.Id)
            .select('Id', 'Title', 'UniqueCode', 'Location', 'Leader/Id', 'Leader/Title',
                 'LeaderDepartment/Id', 'LeaderDepartment/Title').expand('Leader', 'LeaderDepartment')();
        return result as IDepartment;
    } catch (error) {
        console.error(`Error fetching department for user ID ${userId}:`, error);
        return undefined;
    }
}


export const fetchDepartmentByDepartmentId = async (sp: SPFI, departmentId: number): Promise<IDepartment | undefined> => {
    try {
        const result = await sp.web.lists.getByTitle("Oddeleni").items
            .getById(departmentId)
            .select('Id', 'Title', 'UniqueCode', 'Location', 'Leader/Id', 'Leader/Title',
                 'LeaderDepartment/Id', 'LeaderDepartment/Title').expand('Leader', 'LeaderDepartment')();
        return result as IDepartment;
    } catch (error) {
        console.error(`Error fetching department for department ID ${departmentId}: `, error);
        return undefined;
    }
}


export const getLeaderInfo = async (sp: SPFI, user: IContact): Promise<IContact> => {
    const department = await fetchDepartmentByUserId(sp, user.Id);
    return department?.Leader || { Id: 0, Title: '' };
}

export const fetchEmployeeIdsByDepartment = async (sp: SPFI, departmentKey: number): Promise<number[]> => {
    try {
        // 1. Get all Position IDs for the given department UniqueCode
        const positions = await sp.web.lists.getByTitle('Pozice').items
            .select('Id')
            .filter(`Department/UniqueCode eq ${departmentKey}`)();

        if (positions.length === 0) {
            return []; // No positions in this department
        }

        const positionIds = positions.map(p => p.Id);

        // 2. Build a filter to get all commitments for those positions
        // SharePoint has a URL length limit, so we may need to batch this if there are many positions.
        // For a reasonable number of positions (< 100), a single query should be fine.
        const positionFilter = positionIds.map(id => `Position/Id eq ${id}`).join(' or ');

        const commitments = await sp.web.lists.getByTitle('Uvazky').items
            .select('Employee/Id')
            .expand('Employee')
            .filter(positionFilter)();

        // 3. Extract unique employee IDs from the commitments
        const employeeIds = commitments
            .filter(c => c.Employee?.Id) // Ensure Employee and Id exist
            .map(c => c.Employee.Id);

        return Array.from(new Set(employeeIds)); // Return unique IDs

    } catch (error) {
        console.error(`Error fetching employee IDs for department key ${departmentKey}:`, error);
        return [];
    }
};

export const fetchAbsencesAwaitingApproval = async (sp: SPFI, user: IContact): Promise<IAbsence[]> => {
        try {
            const results = await sp.web.lists.getByTitle('Absence').items
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

export const fetchAbsences = async (sp: SPFI, contact: IContact): Promise<IAbsence[]> => {
        try {
            const result = await sp.web.lists.getByTitle('Absence').items
                .select('Id', 'Title', 
                    'Employee/Id', 'Employee/Title', 
                    'AbsenceTypeId', 'AbsenceType/Title', 'To', 'Delete', 'Approvee/Id', 'Approvee/Title',
                    'From', 'Notes', 'NoteForLeader', 'Approved', 'Rejected').expand('Employee, AbsenceType', 'Approvee').filter(`Employee/Id eq '${contact.Id}'`)();
    
            return result as IAbsence[];
        } catch (exception){
            console.error("Error fetching absences: ", exception);
            return [];
        }
    }

export const fetchAllDepartments = async (sp: SPFI): Promise<IDepartment[]> => {
    try {
        const result = await sp.web.lists.getByTitle('Oddeleni').items
        .select('Id', 'Title', 'UniqueCode', 'Location', 'Leader/Id', 'Leader/Title').expand('Leader')();

        return result as IDepartment[];
    } catch (exception) {
        console.error("Error fetching departments: ", exception);
        return [];
    }
}

export const fetchAllCommitments = async (sp: SPFI): Promise<ICommitment[]> => {
    try {
        const results = await sp.web.lists.getByTitle('Uvazky').items
            .select(
                "Id", "Title", "WorkHoursPerDay", "MainCommitment", "From", "To",
                "Employee/Id", "Employee/Title",
                "Position/Id", "Position/Title" // Removed the unsupported nested select
            )
            .expand("Employee", "Position")(); // Removed the unsupported nested expand

        return results as ICommitment[];
    } catch (exception) {
        console.error("Error fetching commitments: ", exception);
        return [];
    }
}

export const deleteAbsence = async (sp: SPFI, id: number): Promise<void> => {
    try {
        await sp.web.lists.getByTitle('Absence').items.getById(id).delete();
    } catch (exception) {
        console.error("Error deleting absence: ", exception);
        return;
    }
}


export const isUserInGroup = async (sp: SPFI, groupName: string): Promise<boolean> => {
    try {
      const response = await sp.web.currentUser.groups.filter(`LoginName eq '${groupName}'`)();
      return response.length > 0;
    } catch (error) {
      console.error('Error checking group membership:', error);
      return false;
    }
  };