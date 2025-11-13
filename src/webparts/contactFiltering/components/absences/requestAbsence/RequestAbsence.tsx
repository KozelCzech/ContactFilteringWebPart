import * as React from 'react';
import styles from './RequestAbsence.module.scss';
import { IContact } from '../../../models/IContact';
import { DatePicker, DayOfWeek, DefaultButton, Dropdown, IDropdownOption, PrimaryButton, TextField, IChoiceGroupOption, ChoiceGroup } from '@fluentui/react';
import { CzechDatePickerStrings } from '../../../localization/cs-CZ'
import { IAbsence, IAbsenceType } from '../AbsenceInterfaces';
import { useEffect, useState } from 'react';
import { SPFI } from '@pnp/sp';
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/fields";
import { addDays } from '@fluentui/date-time-utilities';
import { fetchUserWorkHours, getLeaderInfo } from '../../../../../utils/userUtils';
import { getCzechHolidays } from '../../../../../utils/dateUtils';
import { fetchAbsenceTypes, PTOHoursLeft } from '../../../../../utils/ptoUtils';


export interface IRequestAbsenceProps {
    user: IContact;
    sp: SPFI;
    onUpdate: () => void;
}

interface IAbsenceValidationErrors {
    absenceType?: string;
    from?: string;
    to?: string;
    pto?: string;
}




type TimeSelectionType = 'FullDay' | 'HalfDayAM' | 'HalfDayPM' | 'Hourly';


const RequestAbsence: React.FC<IRequestAbsenceProps> = (props) => {
    const { user, sp, onUpdate} = props;
    const [ newAbsence, setNewAbsence ] = useState<IAbsence>(() => {
        const fromDate = new Date();
        fromDate.setHours(0, 0, 0, 0);

        const toDate = new Date();
        toDate.setHours(23, 59, 59, 999);

        return {
            Id: 0,
            Employee: { Id: user.Id, Title: user.Title },
            AbsenceType: { Id: 0, Title: '' },
            From: fromDate,
            To: toDate,
            Notes: '',
            NoteForLeader: '',
            Approved: false,
            Title: '',
            Approvee: {Id: 0, Title: ''},
            TimeType: '',
            HoursUsed: 0
        };
    });
    const [ errors, setErrors ] = useState<IAbsenceValidationErrors>({});
    const [ absenceTypes, setAbsenceTypes ] = useState<IAbsenceType[]>([]);
    const [ absenceTypeOptions, setAbsenceTypeOptions ] = useState<IDropdownOption[]>([]);
    const [ startDayTimeType, setStartDayTimeType ] = useState<TimeSelectionType>('FullDay');
    const [ endDayTimeType, setEndDayTimeType ] = useState<TimeSelectionType>('FullDay');
    const [ startDayHours, setStartDayHours ] = useState<number>(8);
    const [ endDayHours, setEndDayHours ] = useState<number>(8);

    const timeTypeOptions: IChoiceGroupOption[] = [
        { key: 'FullDay', text: 'Celý den' },
        { key: 'HalfDayAM', text: 'Dopoledne (AM)' },
        { key: 'HalfDayPM', text: 'Odpoledne (PM)' },
        { key: 'Hourly', text: 'Hodinový' },
    ];

    const onStartDayTimeTypeChange = (ev?: React.FormEvent<HTMLElement | HTMLInputElement>, option?: IChoiceGroupOption): void => {
        if (option) setStartDayTimeType(option.key as TimeSelectionType);
    };
    const onEndDayTimeTypeChange = (ev?: React.FormEvent<HTMLElement | HTMLInputElement>, option?: IChoiceGroupOption): void => {
        if (option) setEndDayTimeType(option.key as TimeSelectionType);
    };


    const isOnLeave = async (personId: number): Promise<boolean> => {
        try{
            const result = await sp.web.lists.getByTitle("Absence").items
                .select('Id', 'Title', 
                    'Employee/Id', 'Employee/Title', 
                    'AbsenceType/Id', 'AbsenceType/Title', 'To',
                    'From', 'Notes', 'NoteForLeader',
                    'Approved', 'Approvee/Id', 'Approvee/Title')
                .expand('Employee, Approvee, AbsenceType')
                .filter(`Employee/Id eq ${personId} and Approved eq 1`)();

            const absences: IAbsence[] = result as IAbsence[];
            const today = new Date;

            return absences.some(abs => new Date(abs.From) <= today && new Date(abs.To) >= today);
        } catch (exception) {
            console.error(exception);
            return false;
        }
    }


    const getValidLeader = async (person: IContact, depth = 0): Promise<IContact> => {
        try {
            if (depth > 10) { // Add a depth limit to prevent infinite recursion
                throw new Error("Could not find a valid leader within 10 levels of hierarchy.");
            }
            // 1. Check primary leader
            if (person.Leader) {
                const isLeaderOnLeave = await isOnLeave(person.Leader.Id || person.Leader.ID || 0);
                if (!isLeaderOnLeave) return person.Leader; // Return the leader if they are not on leave
            }
 
            // 2. If primary leader is unavailable, check backup leader
            if (person.BackupLeader) {
                const isBackupLeaderOnLeave = await isOnLeave(person.BackupLeader.Id || person.BackupLeader.ID || 0);
                if (!isBackupLeaderOnLeave) return person.BackupLeader; // Return backup if not on leave
            }

            // 3. If both are unavailable, fall back to the department leader logic.
            // Use the 'person' from the current recursive call, not the original 'user'.
            const departmentLeaderInfo = await getLeaderInfo(sp, person);
            const isDepartmentLeaderOnLeave = await isOnLeave(departmentLeaderInfo.Id);
            if (!isDepartmentLeaderOnLeave) {
                return departmentLeaderInfo; // Return department leader if not on leave
            } else {
                return getValidLeader(departmentLeaderInfo, depth + 1); // Recurse with the next leader
            }
        } catch (exception) {
            console.error("Couldnt get any leader! " + exception);
            return {Id: 0, Title: ''};   
        }
    }


    const addAbsence = async (PTOHours: number): Promise<void> => {
        try {
            const list = sp.web.lists.getByTitle("Absence");
            // When adding an item with a lookup field, you must use the 'FieldNameId' syntax.
            const bossMan: IContact = await getValidLeader(user);
            const itemToAdd = {
                EmployeeId: newAbsence.Employee.Id,
                ApproveeId: bossMan.Id || bossMan.ID,
                AbsenceTypeId: newAbsence.AbsenceType.Id,
                From: newAbsence.From,
                To: newAbsence.To,
                Notes: newAbsence.Notes,
                NoteForLeader: newAbsence.NoteForLeader,
                HoursUsed: PTOHours
            };
            await list.items.add(itemToAdd);
            //Need to request approval after being created
            //Email Leader if he isnt absent, else email backup leader
            // if person doesnt have a leader themselves, look into department leader
        } catch (exception) {
            console.error("Error adding absence: ", exception);
        }
    }


    const getHolidaysForDateRange = (startYear: number, endYear: number): Date[] => {
        let allHolidays: Date[] = [];
        for (let year = startYear; year <= endYear; year++) {
            const holidaysForYear = getCzechHolidays(year).map(h => h.date);
            allHolidays = allHolidays.concat(holidaysForYear);
        }
        return allHolidays;
    };

    const isWeekend = (date: Date): boolean => {
        const day = date.getDay();
        return day === 6 || day === 0; // 6 = Saturday, 0 = Sunday
    };

    const calculateWorkdays = async (from: Date, to: Date): Promise<number> => {
        const holidays = getHolidaysForDateRange(from.getFullYear(), to.getFullYear());
        let workdays = 0;
        let currentDate = new Date(from);
    
        while (currentDate <= to) {
            if (!isWeekend(currentDate)) {
                const currentUTCDate = new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()));
                const isHoliday = holidays.some(holiday => holiday.getTime() === currentUTCDate.getTime());
                if (!isHoliday) {
                    workdays++;
                }
            }
            currentDate = addDays(currentDate, 1);
        }
        return workdays;
    };


    const calculatePTOHours = async (from: Date, to: Date): Promise<number> => {
        const holidays = getHolidaysForDateRange(from.getFullYear(), to.getFullYear());
        const isWorkday = (date: Date): boolean => {
            if (isWeekend(date)) return false;
            const currentUTCDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
            return !holidays.some(holiday => holiday.getTime() === currentUTCDate.getTime());
        };

        const workDayHours: number = await fetchUserWorkHours(sp, user.Id);
        const isSameDay = from.toDateString() === to.toDateString();
        const workdays = await calculateWorkdays(from, to);

        if (workdays === 0) {
            return 0;
        }
    
        const getHoursForTimeType = (timeType: TimeSelectionType, customHours: number): number => {
            switch (timeType) {
                case 'FullDay': return workDayHours;
                case 'HalfDayAM':
                case 'HalfDayPM': return workDayHours / 2;
                case 'Hourly': return customHours;
                default: return 0;
            }
        };
    
        if (isSameDay) {
            // For a single day request, it must be a workday to count.
            return isWorkday(from) ? getHoursForTimeType(startDayTimeType, startDayHours) : 0;
        } 
        
        // For multi-day requests
        const startDayHoursUsed = isWorkday(from) ? getHoursForTimeType(startDayTimeType, startDayHours) : 0;
        const endDayHoursUsed = isWorkday(to) ? getHoursForTimeType(endDayTimeType, endDayHours) : 0;
    
        // Adjust workday count based on whether start/end days are workdays
        let fullWorkdaysInBetween = workdays;
        if (isWorkday(from)) fullWorkdaysInBetween--;
        if (isWorkday(to)) fullWorkdaysInBetween--;

        const hoursForFullDays = fullWorkdaysInBetween * workDayHours;
    
        return startDayHoursUsed + endDayHoursUsed + hoursForFullDays;
    }


    const handleSaveButton = async (): Promise<void> => {
        const validationErrors: IAbsenceValidationErrors = {...errors};
        
        // --- Validation ---
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set to midnight to compare dates only

        if (!newAbsence.AbsenceType || !newAbsence.AbsenceType.Id) {
            validationErrors.absenceType = 'Please select an absence type.';
        }

        if (newAbsence.To < today && newAbsence.To.toDateString() !== today.toDateString()) {
            validationErrors.to = "The 'To' date cannot be in the past.";
        }

        if (newAbsence.From < today && newAbsence.From.toDateString() !== today.toDateString()) {
            validationErrors.from = "The 'From' date cannot be in the past.";
        }

        if (newAbsence.To < newAbsence.From) {
            validationErrors.to = "The 'To' date cannot be before the 'From' date.";
        }
        
        setErrors(validationErrors);
        
        
        const activeErrors = Object.keys(validationErrors).filter(key => validationErrors[key as keyof IAbsenceValidationErrors] !== undefined);

        if (activeErrors.length > 0) {
            return;
        }
        // --- End of Validation ---

        // The PTO calculation is now done in useEffect, we just need to re-verify
        // in case something changed. The result should be cached and fast.
        const ptoHours = await calculatePTOHours(newAbsence.From, newAbsence.To);
        
        await addAbsence(ptoHours);
        onUpdate();
    }

    const handleCloseButton = (): void => {
        onUpdate();
    }


    const onAbsenceTypeChange = (event: React.FormEvent<HTMLDivElement>, option?: IDropdownOption): void => {
        if (option) {
            setErrors(prev => ({ ...prev, absenceType: undefined }));
            setNewAbsence(prev => ({ ...prev, AbsenceType: {Id: option.key as number, Title: option.text as string} }));
        }
    }

    const onToChange = (date: Date | null | undefined): void => {
        if (date) {
            const newToDate = new Date(newAbsence.To);
            newToDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());

            switch (endDayTimeType) {
                case 'FullDay':
                    newToDate.setHours(23, 59, 59, 999);
                    break;
                case 'HalfDayAM':
                    newToDate.setHours(12, 0, 0, 0); // Ends at noon
                    break;
                case 'HalfDayPM':
                    newToDate.setHours(23, 59, 59, 999); // Assumes PM is afternoon until end of day
                    break;
                case 'Hourly':
                    // Time is set by TimePicker, just ensure date part is correct
                    break;
            }

            setErrors(prev => ({ ...prev, to: undefined }));
            setNewAbsence(prev => ({ ...prev, To: newToDate }));
        }
    }

    const onFromChange = (date: Date | null | undefined): void => {
        if (date) {
            const newFromDate = new Date(newAbsence.From);
            newFromDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());

            switch (startDayTimeType) {
                case 'FullDay':
                    newFromDate.setHours(0, 0, 0, 0);
                    break;
                case 'HalfDayAM':
                    newFromDate.setHours(0, 0, 0, 0); // Starts at beginning of day
                    break;
                case 'HalfDayPM':
                    newFromDate.setHours(12, 0, 0, 0); // Starts at noon
                    break;
                case 'Hourly':
                    // Time is set by TimePicker, just ensure date part is correct
                    break;
            }

            setErrors(prev => ({ ...prev, from: undefined }));
            setNewAbsence(prev => ({ ...prev, From: newFromDate }));
        }
    }

    const onNoteChange = (event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string): void => {
        setNewAbsence(prev => ({ ...prev, Notes: newValue || '' }));
    }

    const onNoteForLeaderChange = (event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string): void => {
        setNewAbsence(prev => ({ ...prev, NoteForLeader: newValue || '' }));
    }

    useEffect(() => {
        if (sp) {
            fetchAbsenceTypes(sp)
                .then(types => {
                    setAbsenceTypes(types);
                    if (types && types.length > 0) {
                        const options: IDropdownOption[] = types.map(choice => ({
                            key: choice.Id,
                            text: choice.Title
                        }));
                        setAbsenceTypeOptions(options);
                    }
                })
                .catch(error => {
                    console.error("Error fetching absence types: ", error);
                    setErrors(prev => ({ ...prev, absenceType: "Could not load absence types." }));
                });
        }
    }, [sp]);

    useEffect(() => {
        const validateAndCalculatePTO = async (): Promise<void> => {
            if (absenceTypes.some(type => type.TakesPTO && type.Id === newAbsence.AbsenceType.Id)) {
                const ptoHours = await calculatePTOHours(newAbsence.From, newAbsence.To);
                const hoursLeft = await PTOHoursLeft(sp, user.Id);

                if (ptoHours > hoursLeft) {
                    setErrors(prev => ({ ...prev, pto: `You do not have enough PTO. You are requesting ${ptoHours} hours, but you only have ${hoursLeft} hours left.` }));
                } else {
                    setErrors(prev => ({ ...prev, pto: undefined }));
                }
            } else {
                setErrors(prev => ({ ...prev, pto: undefined }));
            }
        };

        validateAndCalculatePTO().catch(console.error);

    }, [newAbsence, startDayTimeType, endDayTimeType, startDayHours, endDayHours, absenceTypes]);
    
    return (
        <div className={styles.requestAbsence}>
            <h3 className={styles.title}>Request Absence</h3>
            <div className={styles.formContainer}>
                <TextField label='Name' value={`${user.FirstName} ${user.LastName}`} disabled />
                <Dropdown
                    label='Absence Type'
                    placeholder="Select an absence type..."
                    options={absenceTypeOptions}
                    errorMessage={errors.absenceType}
                    onChange={onAbsenceTypeChange}
                />
                <div className={styles.dateRow}>
                    <DatePicker
                        className={styles.datePicker}
                        firstDayOfWeek={DayOfWeek.Monday}
                        ariaLabel='Select a start date'
                        label='From'
                        strings={CzechDatePickerStrings}
                        value={newAbsence.From}
                        onSelectDate={onFromChange}
                        minDate={new Date()}/>
                    <ChoiceGroup selectedKey={startDayTimeType} options={timeTypeOptions} onChange={onStartDayTimeTypeChange} />
                    {startDayTimeType === 'Hourly' && ( // Replaced TimePicker with TextField for hours
                        <TextField
                            label="Hours"
                            type="number"
                            value={startDayHours.toString()}
                            onChange={(ev, val) => setStartDayHours(Number(val) || 0)}
                            min={1}
                        />
                    )}
                    {errors.from && <p className={styles.errorMessage}>{errors.from}</p>}
                </div>
                <div className={styles.dateRow}>
                    <DatePicker
                        className={styles.datePicker}
                        firstDayOfWeek={DayOfWeek.Monday}
                        ariaLabel='Select an end date'
                        label='To'
                        strings={CzechDatePickerStrings}
                        value={newAbsence.To}
                        onSelectDate={onToChange}
                        minDate={newAbsence.From}/>
                    <ChoiceGroup selectedKey={endDayTimeType} options={timeTypeOptions} onChange={onEndDayTimeTypeChange} />
                    {endDayTimeType === 'Hourly' && ( // Replaced TimePicker with TextField for hours
                        <TextField
                            label="Hours"
                            type="number"
                            value={endDayHours.toString()}
                            onChange={(ev, val) => setEndDayHours(Number(val) || 0)}
                            min={1}
                        />
                    )}
                    {errors.to && <p className={styles.errorMessage}>{errors.to}</p>}
                </div>
                    
                <TextField label='Note for CoHe' multiline rows={3} onChange={onNoteChange} />
                <TextField label='Note for leader' multiline rows={3} onChange={onNoteForLeaderChange} />
            </div>
            {errors.pto && <p className={styles.errorMessage}>{errors.pto}</p>}
            <div className={styles.actionsContainer}>
                <PrimaryButton
                    text='Submit'
                    style={{ marginRight: '8px' }} 
                    onClick={handleSaveButton} />
                <DefaultButton text='Cancel' onClick={handleCloseButton} />
            </div>
            {/* TODO: Use TimeType field to get the amount of time spent on the time off
                     FullDay = 8hrs, 
                     halfDayAM is 4 hours in the morning (or based on the employment time),
                     halfDayPM is 4 hours in the afternoon, 
                     hourly is gonna have a time picker
                     
                     time off goes from one year to the next for up to 3 years, keep it stored somewhere (make it customisable)
                        add it to the base amount each year
                        the priority for decreasing available time off comes from the oldest available PTO

                        if someone starts later in the year or comes in later the available PTO is reduced!!! half a year is 12.5 days etc
                        
                        DONT forget about weekends, and holidays + Easter(PITA)
                        
                        include sick days and homeoffice doesnt take away from time off

                        Users can have different types of employement 
                            for example only 6 hours, in that case half day would be 3 hours instead of 4
                            calculate it based on emplyement type

                            sometimes emplyment can change mid year so store it in a way that allows for that
                            Add this in the Uvazky sharepoint list
                                If a user has multiple Employments for the same company the amount of work per day is added together


                    
                        Decide where leaders decide PTO time themselves and where its automatically calculated
                    */}
        </div>
  );

}


export default RequestAbsence;