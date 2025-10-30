import { addDays } from "@fluentui/react";
import { ICallendarEvent } from "../webparts/contactFiltering/components/absences/AbsenceList/AbsenceList";

export const formatDate = (dateString: string): string => {
    if (!dateString) return "N/A";

    const options: Intl.DateTimeFormatOptions = {
        year: "numeric",
        month: "numeric",
        day: "numeric",
    };

    return new Intl.DateTimeFormat("en-UK", options).format(new Date(dateString))
}

export interface IHoliday {
    name: string;
    date: Date;
}

export const getCzechHolidays = (year: number): IHoliday[] => {
    
        // Function to calculate Easter Sunday for a given year (Computus algorithm)
        const getEaster = (y: number): Date => {
            const a = y % 19;
            const b = Math.floor(y / 100);
            const c = y % 100;
            const d = Math.floor(b / 4);
            const e = b % 4;
            const f = Math.floor((b + 8) / 25);
            const g = Math.floor((b - f + 1) / 3);
            const h = (19 * a + b - d - g + 15) % 30;
            const i = Math.floor(c / 4);
            const k = c % 4;
            const l = (32 + 2 * e + 2 * i - h - k) % 7;
            const m = Math.floor((a + 11 * h + 22 * l) / 451);
            const month = Math.floor((h + l - 7 * m + 114) / 31); // Month is 1-based
            const day = ((h + l - 7 * m + 114) % 31) + 1;
            return new Date(Date.UTC(y, month - 1, day));
        };
    
        const easterSunday = getEaster(year);
        const goodFriday = addDays(easterSunday, -2);
        const easterMonday = addDays(easterSunday, 1);
    
        const holidayDefinitions: { name: string; date: Date }[] = [
            { name: 'Nový rok', date: new Date(Date.UTC(year, 0, 1)) },
            { name: 'Velký pátek', date: goodFriday },
            { name: 'Velikonoční pondělí', date: easterMonday },
            { name: 'Svátek práce', date: new Date(Date.UTC(year, 4, 1)) },
            { name: 'Den vítězství', date: new Date(Date.UTC(year, 4, 8)) },
            { name: 'Den slovanských věrozvěstů Cyrila a Metoděje', date: new Date(Date.UTC(year, 6, 5)) },
            { name: 'Den upálení mistra Jana Husa', date: new Date(Date.UTC(year, 6, 6)) },
            { name: 'Den české státnosti', date: new Date(Date.UTC(year, 8, 28)) },
            { name: 'Den vzniku samostatného československého státu', date: new Date(Date.UTC(year, 9, 28)) },
            { name: 'Den boje za svobodu a demokracii', date: new Date(Date.UTC(year, 10, 17)) },
            { name: 'Štědrý den', date: new Date(Date.UTC(year, 11, 24)) },
            { name: '1. svátek vánoční', date: new Date(Date.UTC(year, 11, 25)) },
            { name: '2. svátek vánoční', date: new Date(Date.UTC(year, 11, 26)) },
        ];
    
        return holidayDefinitions;
    }


    export const getCzechHolidaysCallendarEvents = (year: number ): ICallendarEvent[] => {
        const holidays: ICallendarEvent[] = [];
        const holidayDefinitions = getCzechHolidays(year);

        holidayDefinitions.forEach(holiday => {
            holidays.push({
                title: holiday.name,
                start: holiday.date.toISOString().split('T')[0],
                end: holiday.date.toISOString().split('T')[0],
                display: 'background', // This is a valid FullCalendar property
                color: '#cccccc' // This is a valid FullCalendar property
            });
        });
    
        return holidays;
    }