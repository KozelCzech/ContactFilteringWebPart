import { SPFI } from "@pnp/sp";

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


interface usedPTOHours {
    Id: number;
    Title: string;
    Employee: {
        Id: number;
        Title: string;
    };
    HoursUsed: number;
    YearOfUse: number;
}



export const PTOHoursLeft = async (sp: SPFI, employeeId: number): Promise<number> => {
    try {
        let totalPTOHours = 0;
        const storedPTOHours = await sp.web.lists.getByTitle('PTOHours').items
            .select(
                'Id',
                'Title',
                'Employee/Id',
                'Employee/Title',
                'PTOAmount',
                'ValidFrom' // Added ValidFrom to the select query
            )
            .expand('Employee')
            .filter('Employee/Id eq ' + employeeId)();
            console.log("Stored PTO: ", storedPTOHours);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        storedPTOHours.forEach((item: storedPTOHours) => {
            if (!item.ValidFrom || !item.PTOAmount) return;

            const validFrom = new Date(item.ValidFrom);
            const currentDate = new Date();

            // PTO is valid for the year it's granted in, plus the entire following year.
            const expirationYear = validFrom.getFullYear() + 1;
            const validUntil = new Date(expirationYear, 11, 31); // December 31st of the expiration year

            if (currentDate >= validFrom && currentDate <= validUntil) {
                totalPTOHours += item.PTOAmount;
            }
        })

        const usedPTOHours = await sp.web.lists.getByTitle('UsedPTOHours').items
            .select(
                'Id',
                'Title',
                'Employee/Id',
                'Employee/Title',
                'HoursUsed',
                'YearOfUse'
            )
            .expand('Employee')
            .filter(
                'Employee/Id eq ' + employeeId +
                ' and YearOfUse eq ' + new Date().getFullYear()
            )();
            console.log("used PTO: ", usedPTOHours);
        usedPTOHours.forEach((item: usedPTOHours) => {
            totalPTOHours -= item.HoursUsed;
        });


        return totalPTOHours;
    } catch (exception) {
        console.error("Error fetching PTO hours left: ", exception);
        return 0;
    
    }
}