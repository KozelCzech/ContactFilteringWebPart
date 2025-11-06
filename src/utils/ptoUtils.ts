import { SPFI } from "@pnp/sp";
import { IAbsence } from "../webparts/contactFiltering/components/absences/AbsenceInterfaces";

interface storedPTOHours {
    Id: number;
    Title: string;
    Employee: {
        Id: number;
        Title: string;
    };
    PTOAmount: number;
    ValidFrom: Date;
}

/**
 * Calculates the remaining PTO hours for an employee as of a specific date.
 * @param sp The SPFI object.
 * @param employeeId The ID of the employee.
 * @param asOfDate The date to calculate the balance for. Defaults to the current date.
 * @returns A promise that resolves to the number of PTO hours left.
 */
export const PTOHoursLeft = async (sp: SPFI, employeeId: number, asOfDate: Date = new Date()): Promise<number> => {
    try {
        let totalPTOHours = 0;

        // 1. Get all PTO grants valid up to the asOfDate
        const storedPTOHours = await sp.web.lists.getByTitle('PTOHours').items
            .select(
                'Id',
                'Employee/Id',
                'PTOAmount',
                'ValidFrom'
            )
            .expand('Employee')
            .filter(`Employee/Id eq ${employeeId}`)();

        storedPTOHours.forEach((item: storedPTOHours) => {
            if (!item.ValidFrom || !item.PTOAmount) return;

            const validFrom = new Date(item.ValidFrom);

            // Only include grants that were valid on or before the "as of" date.
            // TODO: Add expiration logic here based on your 3-year rule.
            if (validFrom <= asOfDate) {
                totalPTOHours += item.PTOAmount;
            }
        });

        // 2. Get all approved absences that started on or before the asOfDate
        const usedAbsences = await sp.web.lists.getByTitle('Absence').items
            .select(
                'Id',
                'Employee/Id',
                'HoursUsed',
                'Approved',
                'From'
            )
            .expand('Employee')
            .filter(`Employee/Id eq ${employeeId} and Approved eq true and From le '${asOfDate.toISOString()}'`)();

        usedAbsences.forEach((item: IAbsence) => {
            totalPTOHours -= item.HoursUsed;
        });

        return totalPTOHours;
    } catch (exception) {
        console.error("Error fetching PTO hours left: ", exception);
        return 0;
    
    }
}

export const createNewYearPTO = async (sp: SPFI, employeeId: number): Promise<void> => {
    try {
        // Calculate leftover hours as of the last moment of the previous year.
        const today = new Date();
        const lastDayOfPreviousYear = new Date(today.getFullYear(), 0, 0); // This gives Dec 31 of the previous year

        const leftoverHours = await PTOHoursLeft(sp, employeeId, lastDayOfPreviousYear);
        const results = await sp.web.lists.getByTitle('ContactFilteringTest').items
            .select("Id", "TimeOffHours")
            .filter(`Id eq ${employeeId}`)();

        const newHours = results[0].TimeOffHours + leftoverHours;
        const list = sp.web.lists.getByTitle("PTOHours");

        const itemToAdd = {
            EmployeeId: employeeId,
            PTOAmount: newHours,
            ValidFrom: new Date()
        }

        await list.items.add(itemToAdd);

    } catch (exception) {
        console.error("Error creating new year PTO: ", exception);
    }
}