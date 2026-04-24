import * as React from 'react';
import styles from './RequestAbsence.module.scss';
import { IContact } from '../../../models/IContact';
import { DatePicker, DayOfWeek, DefaultButton, Dropdown, IDropdownOption, PrimaryButton, TextField, IChoiceGroupOption, ChoiceGroup, TimePicker, Spinner, SpinnerSize } from '@fluentui/react';
import { CzechDatePickerStrings } from '../../../localization/cs-CZ'
import { IAbsence, IAbsenceType } from '../AbsenceInterfaces';
import { useEffect, useState } from 'react';
import { SPFI } from '@pnp/sp';
import { GraphFI } from '@pnp/graph';
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/fields";
import { addDays } from '@fluentui/date-time-utilities';
import { fetchAllUsers, fetchDepartmentByDepartmentId, fetchDepartmentByUserId, fetchMainCommitment, fetchUserById, fetchUserWorkHours, ICommitment, IDepartment, isUserInGroup } from '../../../../../services/userServices';
import { getCzechHolidays } from '../../../../../utils/dateUtils';
import { PTOHoursLeft } from '../../../../../services/ptoServices';
import { fetchAbsenceTypes, fetchApprovedAbsences, addAbsence as addAbsenceService, updateAbsence } from '../../../../../services/absenceServices';
import { requestType, sendAbsenceEmail } from '../../../../../utils/emailUtils';


export interface IRequestAbsenceProps {
    user: IContact;
    sp: SPFI;
    graph: GraphFI;
    existingAbsence?: IAbsence;
    onUpdate: () => void;
}

interface IAbsenceValidationErrors {
    absenceType?: string;
    from?: string;
    to?: string;
    pto?: string;
    user?: string;
}



export enum TimeSelectionType {
    FullDay = 'FullDay',
    HalfDayAM = 'HalfDayAM',
    HalfDayPM = 'HalfDayPM',
    Hourly = 'Hourly'
}


const RequestAbsence: React.FC<IRequestAbsenceProps> = (props) => {
    const { user, sp, graph, existingAbsence, onUpdate } = props;
    const [newAbsence, setNewAbsence] = useState<IAbsence>(() => {
        if (existingAbsence) {
            return {
                ...existingAbsence,
                AbsenceType: {
                    Id: existingAbsence.AbsenceType?.Id || (existingAbsence as IAbsence & { AbsenceTypeId: number }).AbsenceTypeId,
                    Title: existingAbsence.AbsenceType?.Title || ''
                },
                From: new Date(existingAbsence.From),
                To: new Date(existingAbsence.To),
            };
        }

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
            Rejected: false,
            Title: '',
            Approvee: { Id: 0, Title: '' },
            TimeType: '',
            HoursUsed: 0
        };
    });
    const [errors, setErrors] = useState<IAbsenceValidationErrors>({});
    const [absenceTypes, setAbsenceTypes] = useState<IAbsenceType[]>([]);

    const [startDayTimeType, setStartDayTimeType] = useState<TimeSelectionType>(TimeSelectionType.FullDay);

    const [startDayHours, setStartDayHours] = useState<number>(8);
    const [fromTime, setFromTime] = useState<Date>(() => {
        if (existingAbsence) return new Date(existingAbsence.From);
        const d = new Date(); d.setHours(8, 0, 0, 0); return d;
    });
    const [toTime, setToTime] = useState<Date>(() => {
        if (existingAbsence) return new Date(existingAbsence.To);
        const d = new Date(); d.setHours(16, 0, 0, 0); return d;
    });
    const [totalHoursRequested, setTotalHoursRequested] = useState<number>(0);
    const [totalDaysRequested, setTotalDaysRequested] = useState<number>(0);

    const [delegatedAbsence, setDelegatedAbsence] = useState<boolean>(false);
    const [allUsers, setAllUsers] = useState<IContact[]>([]);
    const [mainCommitment, setMainCommitment] = useState<ICommitment | undefined>(undefined);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);


    const timeTypeOptions: IChoiceGroupOption[] = [
        { key: TimeSelectionType.FullDay, text: 'Celý den' },
        { key: TimeSelectionType.HalfDayAM, text: 'Dopoledne (AM)' },
        { key: TimeSelectionType.HalfDayPM, text: 'Odpoledne (PM)' },
        { key: TimeSelectionType.Hourly, text: 'Hodinový' },
    ];

    const onStartDayTimeTypeChange = (ev?: React.FormEvent<HTMLElement | HTMLInputElement>, option?: IChoiceGroupOption): void => {
        if (option) setStartDayTimeType(option.key as TimeSelectionType);
    };

    const getMainCommitment = async (personId: number): Promise<ICommitment | undefined> => {
        try {
            const commitment = await fetchMainCommitment(sp, personId);
            return commitment;
        } catch (exception) {
            console.error(exception);
            return undefined;
        }
    }


    const isOnLeave = async (personId: number): Promise<boolean> => {
        try {
            const absences = await fetchApprovedAbsences(sp, personId);

            const today = new Date;


            return absences.some(abs => {
                const isDateMatch = new Date(abs.From) <= today && new Date(abs.To) >= today;
                const type = absenceTypes.find(t => t.Id === abs.AbsenceType.Id);
                return isDateMatch && (type ? type.isAbsent : true);
            });
        } catch (exception) {
            console.error(exception);
            return false;
        }
    }


    const getDepartmentLeader = async (department: IDepartment): Promise<IContact> => {
        try {
            if (department.Leader) {
                const isGroupLeaderOnLeave = await isOnLeave(department.Leader.Id || department.Leader.ID || 0);
                if (!isGroupLeaderOnLeave) {
                    return department.Leader;
                }
            }

            if (!department.LeaderDepartment || !department.LeaderDepartment.Id || department.LeaderDepartment.Id === department.Id) {
                return department.Leader || { Id: 0, Title: '' };
            }


            const leadDepartment = await fetchDepartmentByDepartmentId(sp, department.LeaderDepartment.Id);
            if (leadDepartment) {
                return getDepartmentLeader(leadDepartment);
            }

            return { Id: 0, Title: '' };
        } catch (error) {
            console.error("Error finding leader: ", error);
            return { Id: 0, Title: '' };
        }
    }


    const getValidLeader = async (absentPerson: IContact): Promise<IContact> => {
        try {
            const person = await fetchUserById(sp, absentPerson.Id);

            // 1. Try Direct Leader
            if (person.Leader) {
                const isOnLeaveStatus = await isOnLeave(person.Leader.Id || person.Leader.ID || 0);
                if (!isOnLeaveStatus) {
                    return person.Leader;
                }
                else {
                    console.info("No Direct Leader")
                }
            }

            // 2. Try Backup Leader
            if (person.BackupLeader) {
                const isBackupOnLeave = await isOnLeave(person.BackupLeader.Id || person.BackupLeader.ID || 0);
                if (!isBackupOnLeave) {
                    return person.BackupLeader;
                }
                else {
                    console.info("No Backup Leader");
                }
            }

            // 3. Escalation Logic
            const userDept = await fetchDepartmentByUserId(sp, person.Id);
            if (userDept) {
                const leader = await getDepartmentLeader(userDept);
                if (leader) return leader;
            }

            return { Id: 0, Title: '' };
        } catch (exception) {
            console.error("Error finding leader: ", exception);
            return { Id: 0, Title: '' };
        }
    }


    const addAbsence = async (PTOHours: number[]): Promise<void> => {
        try {
            let totalPTOHours = 0;
            PTOHours.forEach(hours => { totalPTOHours += hours });

            const bossMan: IContact = await getValidLeader(newAbsence.Employee);
            const itemToAdd = {
                EmployeeId: newAbsence.Employee.Id,
                ApproveeId: bossMan.Id || bossMan.ID,
                AbsenceTypeId: newAbsence.AbsenceType.Id,
                From: newAbsence.From,
                To: newAbsence.To,
                Notes: newAbsence.Notes,
                Approved: false,
                Rejected: false,
                NoteForLeader: newAbsence.NoteForLeader,
                HoursUsed: totalPTOHours,
                FirstMonth: PTOHours[0],
                SecondMonth: PTOHours[1]
            };
            if (existingAbsence && existingAbsence.Id) {
                await updateAbsence(sp, existingAbsence.Id, itemToAdd);
            } else {
                await addAbsenceService(sp, itemToAdd);
            }
            //Need to request approval after being created
            //TODO: Email Leader if he isnt absent, else email backup leader
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



    /**
     * Calculates PTO hours for a given date range and splits them by month.
     * This function is currently unused but is intended for future implementation
     * where absences spanning multiple months need to be saved as separate records.
     * @param from The start date of the absence.
     * @param to The end date of the absence.
     * @returns A promise that resolves to an object with month keys (YYYY-MM) and hour values.
     */
    const calculatePTOHoursByMonth = async (from: Date, to: Date): Promise<number[]> => {
        const holidays = getHolidaysForDateRange(from.getFullYear(), to.getFullYear());
        const workDayHours: number = await fetchUserWorkHours(sp, user.Id);
        const ptoHoursByMonth: number[] = [];
        const firstMonth = from.getMonth();



        const isWorkday = (date: Date): boolean => {
            if (isWeekend(date)) return false;
            const currentUTCDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
            return !holidays.some(holiday => holiday.getTime() === currentUTCDate.getTime());
        };

        let currentDate = new Date(from);
        currentDate.setHours(0, 0, 0, 0); // Start iteration from the beginning of the day

        while (currentDate <= to) {
            if (isWorkday(currentDate)) {
                let hoursForDay = 0;
                const isStartDay = currentDate.toDateString() === from.toDateString();
                const isSingleDayRequest = from.toDateString() === to.toDateString();

                if (isSingleDayRequest || isStartDay) {
                    hoursForDay = startDayTimeType === TimeSelectionType.FullDay ? workDayHours : (startDayTimeType === TimeSelectionType.Hourly ? startDayHours : workDayHours / 2);
                } else { // Full day in between
                    hoursForDay = workDayHours;
                }
                if (currentDate.getMonth() === firstMonth) {
                    ptoHoursByMonth[0] = (ptoHoursByMonth[0] || 0) + hoursForDay;
                } else {
                    ptoHoursByMonth[1] = (ptoHoursByMonth[1] || 0) + hoursForDay;
                }

            }
            currentDate = addDays(currentDate, 1);
        }

        return ptoHoursByMonth;
    }


    const handleSaveButton = async (): Promise<void> => {
        if (isSubmitting) return;
        setIsSubmitting(true);

        try {
            const validationErrors: IAbsenceValidationErrors = { ...errors };

            // --- Validation ---
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Set to midnight to compare dates only

            if (!newAbsence.AbsenceType || !newAbsence.AbsenceType.Id) {
                validationErrors.absenceType = 'Please select an absence type.';
            }

            if (newAbsence.To < newAbsence.From) {
                validationErrors.to = "Datud 'Do' nesmí být před datumem 'Od'.";
            }
            setErrors(validationErrors);


            const activeErrors = Object.keys(validationErrors).filter(key => validationErrors[key as keyof IAbsenceValidationErrors] !== undefined);

            if (activeErrors.length > 0) {
                setIsSubmitting(false);
                return;
            }
            // --- End of Validation ---

            // The PTO calculation is now done in useEffect, we just need to re-verify
            // in case something changed. The result should be cached and fast.
            let ptoHours = [0, 0];
            const currentType = absenceTypes.find(type => type.Id === newAbsence.AbsenceType.Id);

            if (currentType?.TakesPTO) {
                ptoHours = await calculatePTOHoursByMonth(newAbsence.From, newAbsence.To);
            }

            await addAbsence(ptoHours);

            let reqType: requestType;
            if (!existingAbsence || !existingAbsence.Id) {
                reqType = 'Created';
            } else {
                reqType = 'Updated';
            }
            const approvee: IContact = await getValidLeader(newAbsence.Employee);
            await sendAbsenceEmail(graph, sp, approvee, newAbsence, reqType);
            onUpdate();
            setIsSubmitting(false);
        } catch (error) {
            console.error(error);
            setIsSubmitting(false);
        }
    }

    const handleCloseButton = (): void => {
        onUpdate();
    }


    const onAbsenceTypeChange = (event: React.FormEvent<HTMLDivElement>, option?: IDropdownOption): void => {
        if (option) {
            setErrors(prev => ({ ...prev, absenceType: undefined }));
            setNewAbsence(prev => ({ ...prev, AbsenceType: { Id: option.key as number, Title: option.text as string } }));
        }
    }

    const onUserChange = (event: React.FormEvent<HTMLDivElement>, option?: IDropdownOption): void => {
        if (option) {
            setErrors(prev => ({ ...prev, absenceType: undefined }));
            setNewAbsence(prev => ({ ...prev, Employee: { Id: option.key as number, Title: option.text as string } }));
        }
    }

    const onToChange = (date: Date | null | undefined): void => {
        if (date) {
            const newToDate = new Date(newAbsence.To);
            newToDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());

            switch (startDayTimeType) {
                case TimeSelectionType.FullDay:
                    newToDate.setHours(23, 59, 59, 999);
                    break;
                case TimeSelectionType.HalfDayAM:
                    newToDate.setHours(12, 0, 0, 0); // Ends at noon
                    break;
                case TimeSelectionType.HalfDayPM:
                    newToDate.setHours(23, 59, 59, 999); // Assumes PM is afternoon until end of day
                    break;
                case TimeSelectionType.Hourly:
                    //Handled in OnHourChange
                    break;
            }

            setErrors(prev => ({ ...prev, to: undefined }));
            setNewAbsence(prev => ({ ...prev, To: newToDate }));
        }
    }

    const onTimeChange = (date: Date | null | undefined, type: 'from' | 'to'): void => {
        if (!date) return;
        if (type === 'from') setFromTime(date);
        else setToTime(date);
    }

    const onFromChange = (date: Date | null | undefined): void => {
        if (date) {
            const newFromDate = new Date(newAbsence.From);
            newFromDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());

            switch (startDayTimeType) {
                case TimeSelectionType.FullDay:
                    newFromDate.setHours(0, 0, 0, 0);
                    break;
                case TimeSelectionType.HalfDayAM:
                    newFromDate.setHours(0, 0, 0, 0); // Starts at beginning of day
                    break;
                case TimeSelectionType.HalfDayPM:
                    newFromDate.setHours(12, 0, 0, 0); // Starts at noon
                    break;
                case TimeSelectionType.Hourly: {
                    const newToDate = new Date(newAbsence.To);
                    newToDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                    setNewAbsence(prev => ({ ...prev, To: newToDate }));
                }
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

    const onFormatDate = (date?: Date): string => {
        return !date ? '' : `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;
    };

    const onParseDateFromString = (value: string): Date | null => {
        const values = (value || '').trim().split('.');
        const day = values.length > 0 ? parseInt(values[0], 10) : NaN;
        const month = values.length > 1 ? parseInt(values[1], 10) - 1 : NaN;
        let year = values.length > 2 ? parseInt(values[2], 10) : NaN;

        if (year && year < 100) {
            year += 2000;
        }

        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
            return new Date(year, month, day);
        }
        return null;
    };

    useEffect(() => {
        if (!sp) return;

        setIsLoading(true);
        Promise.all([
            fetchAbsenceTypes(sp),
            isUserInGroup(props.sp, "delegatedAbsences"),
            getMainCommitment(user.Id),
            fetchAllUsers(sp)
        ])
            .then(([types, isDelegated, commitment, users]) => {
                setAbsenceTypes(types);
                setDelegatedAbsence(isDelegated);
                if (commitment) setMainCommitment(commitment);
                setAllUsers(users);
                setIsLoading(false);
            })
            .catch(error => {
                console.error("Error loading initial data: ", error);
                setErrors(prev => ({ ...prev, absenceType: "Could not load initial data." }));
                setIsLoading(false);
            });
    }, [sp, user]);


    useEffect(() => {
        if (!existingAbsence && absenceTypes.length > 0) {

            setNewAbsence(prev => {
                if (prev.AbsenceType.Id === 0) {
                    return { ...prev, AbsenceType: absenceTypes[0] };
                }
                return prev;
            });
        }
        else if (existingAbsence) {
            setNewAbsence({
                ...existingAbsence,
                AbsenceType: {
                    Id: existingAbsence.AbsenceType?.Id || (existingAbsence as IAbsence & { AbsenceTypeId: number }).AbsenceTypeId,
                    Title: existingAbsence.AbsenceType?.Title || ''
                },
                From: new Date(existingAbsence.From),
                To: new Date(existingAbsence.To),
            });
        }
    }, [absenceTypes, existingAbsence]);

    // Effect for non-hourly time types
    useEffect(() => {
        if (startDayTimeType === TimeSelectionType.Hourly) return;

        setNewAbsence(prev => {
            const newFrom = new Date(prev.From);
            const newTo = new Date(prev.To);

            switch (startDayTimeType) {
                case TimeSelectionType.FullDay:
                    newFrom.setHours(0, 0, 0, 0);
                    newTo.setHours(23, 59, 59, 999);
                    break;
                case TimeSelectionType.HalfDayAM:
                    newFrom.setHours(0, 0, 0, 0);
                    newTo.setHours(12, 0, 0, 0);
                    break;
                case TimeSelectionType.HalfDayPM:
                    newFrom.setHours(12, 0, 0, 0);
                    newTo.setHours(23, 59, 59, 999);
                    break;
            }
            return { ...prev, From: newFrom, To: newTo };
        });
    }, [startDayTimeType]);

    // Effect for hourly time type
    useEffect(() => {
        if (startDayTimeType !== TimeSelectionType.Hourly) {
            setErrors(prev => ({ ...prev, to: undefined }));
            return;
        }

        const workHours = mainCommitment?.WorkHoursPerDay || 8;

        const d1 = new Date(0, 0, 0, fromTime.getHours(), fromTime.getMinutes());
        const d2 = new Date(0, 0, 0, toTime.getHours(), toTime.getMinutes());
        const diff = (d2.getTime() - d1.getTime()) / (1000 * 60 * 60);

        let validationError: string | undefined = undefined;
        if (diff < 0) {
            validationError = `'Do' čas nesmí být před 'Od' časem.`;
            setStartDayHours(0);
        } else if (diff > workHours) {
            validationError = `Počet hodin nesmí přesáhnout délku úvazku (${workHours}h).`;
            setStartDayHours(diff);
        } else {
            setStartDayHours(diff);
        }

        setErrors(prev => ({ ...prev, to: validationError }));

        setNewAbsence(prev => {
            const newFrom = new Date(prev.From);
            newFrom.setHours(fromTime.getHours(), fromTime.getMinutes(), 0, 0);

            const newTo = new Date(prev.To);
            newTo.setHours(toTime.getHours(), toTime.getMinutes(), 0, 0);

            return { ...prev, From: newFrom, To: newTo };
        });
    }, [startDayTimeType, fromTime, toTime, mainCommitment]);

    useEffect(() => {
        const validateAndCalculatePTO = async (): Promise<void> => {
            const currentType = absenceTypes.find(type => type.Id === newAbsence.AbsenceType.Id);
            const ptoHours = await calculatePTOHoursByMonth(newAbsence.From, newAbsence.To);

            let totalPTOHours = 0;
            ptoHours.forEach(hours => { totalPTOHours += hours });
            setTotalHoursRequested(totalPTOHours);
            const totalDaysUsed = Math.round((totalPTOHours / (mainCommitment?.WorkHoursPerDay || 8)) * 10) / 10;
            setTotalDaysRequested(totalDaysUsed);


            if (currentType?.TakesPTO) {


                const hoursLeft = await PTOHoursLeft(sp, user.Id);

                if (totalPTOHours > hoursLeft) {
                    setErrors(prev => ({ ...prev, pto: `Nemáte dostatek hodin. Žádáte o ${totalPTOHours} hodin dovolené, ale máte pouze ${hoursLeft} hodin.` }));
                } else {
                    setErrors(prev => ({ ...prev, pto: undefined }));
                }
            } else {
                setErrors(prev => ({ ...prev, pto: undefined }));
            }
        };

        validateAndCalculatePTO().catch(console.error);

    }, [newAbsence, startDayTimeType, startDayHours, absenceTypes]);



    const renderUserAndTypeSelector = (): JSX.Element => (
        <>
            {delegatedAbsence &&
                <Dropdown label='Jméno'
                    options={allUsers.map(contact => ({ key: contact.Id, text: `${contact.FirstName} ${contact.LastName}` }))}
                    onChange={onUserChange}
                    errorMessage={errors.user}
                    defaultSelectedKey={newAbsence.Employee.Id}
                /> ||
                <TextField label='Jméno' value={`${user.FirstName} ${user.LastName}`} disabled />
            }
            <Dropdown
                label='Typ absence'
                placeholder="Select an absence type..."
                options={absenceTypes.map(choice => ({
                    key: choice.Id,
                    text: choice.Title
                }))}
                errorMessage={errors.absenceType}
                onChange={onAbsenceTypeChange}
                selectedKey={newAbsence.AbsenceType?.Id || (absenceTypes.length > 0 ? absenceTypes[0].Id : undefined)}
            />
        </>
    );

    const renderDateRangeSelector = (): JSX.Element => (
        <>
            <div className={styles.dateRow}>
                <DatePicker
                    className={styles.datePicker}
                    firstDayOfWeek={DayOfWeek.Monday}
                    ariaLabel='Zvolte začátek dovolené'
                    label='Od'
                    strings={CzechDatePickerStrings}
                    value={newAbsence.From}
                    onSelectDate={onFromChange}
                    formatDate={onFormatDate}
                    parseDateFromString={onParseDateFromString}
                />
                <ChoiceGroup selectedKey={startDayTimeType} options={timeTypeOptions} onChange={onStartDayTimeTypeChange} />
                {errors.from && <p className={styles.errorMessage}>{errors.from}</p>}
            </div>
            <div className={styles.dateRow}>
                {startDayTimeType === TimeSelectionType.FullDay && <DatePicker
                    className={styles.datePicker}
                    firstDayOfWeek={DayOfWeek.Monday}
                    ariaLabel='Zvolte konec dovolené'
                    label='Do'
                    strings={CzechDatePickerStrings}
                    value={newAbsence.To}
                    onSelectDate={onToChange}
                    formatDate={onFormatDate}
                    parseDateFromString={onParseDateFromString}
                />}
                {startDayTimeType === TimeSelectionType.Hourly && (
                    <div className={styles.timePickerContainer}>
                        <TimePicker
                            label="Od"
                            value={fromTime}
                            increments={60}
                            allowFreeform={false}
                            dateAnchor={new Date(2020, 0, 1, 0, 0, 0, 0)}
                            onChange={(e, date) => onTimeChange(date, 'from')}
                        />
                        <TimePicker
                            label="Do"
                            value={toTime}
                            increments={60}
                            allowFreeform={false}
                            dateAnchor={new Date(2020, 0, 1, 0, 0, 0, 0)}
                            onChange={(e, date) => onTimeChange(date, 'to')}
                        />
                    </div>
                )}
                {errors.to && <p className={styles.errorMessage}>{errors.to}</p>}
            </div>
        </>
    );

    if (isLoading) {
        return (
            <div className={styles.requestAbsence} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
                <Spinner size={SpinnerSize.large} label="Načítání..." />
            </div>
        );
    }

    return (
        <div className={styles.requestAbsence}>
            <h3 className={styles.title}>Žádost o nepřítomnost</h3>
            <div className={styles.formContainer}>
                {renderUserAndTypeSelector()}
                {renderDateRangeSelector()}
                <TextField label='Poznámka pro CoHe' multiline rows={3} onChange={onNoteChange} />
                <TextField label='Poznámka pro nadřízeného' multiline rows={3} onChange={onNoteForLeaderChange} />
            </div>
            {errors.pto && <p className={styles.errorMessage}>{errors.pto}</p>}
            <p>{mainCommitment?.MainCommitment}</p>
            <div className={styles.actionsContainer}>
                <div className={styles.totalsContainer}>
                    Celkem hodin: {totalHoursRequested} ({totalDaysRequested} dní)
                </div>
                <PrimaryButton
                    text={isSubmitting ? 'Odesílání...' : 'Odeslat'}
                    style={{ marginRight: '8px' }}
                    disabled={isSubmitting}
                    onClick={handleSaveButton} />
                <DefaultButton text='Zrušit' onClick={handleCloseButton} />
            </div>
        </div>
    );

}


export default RequestAbsence;