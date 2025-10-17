import * as React from 'react';
import styles from './RequestAbsence.module.scss';
import { IContact } from '../../../models/IContact';
import { DatePicker, DayOfWeek, DefaultButton, Dropdown, IDropdownOption, PrimaryButton, TextField } from '@fluentui/react';
import { CzechDatePickerStrings } from '../../../localization/cs-CZ'
import { IAbsence } from '../AbsenceInterfaces';
import { useEffect, useState } from 'react';
import { SPFI } from '@pnp/sp';
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/fields";
import { IFieldInfo } from '@pnp/sp/fields';
import { getLeaderInfo } from '../../../../../utils/userUtils';


export interface IRequestAbsenceProps {
    user: IContact;
    sp: SPFI;
    onUpdate: () => void;
}

interface IAbsenceValidationErrors {
    absenceType?: string;
    from?: string;
    to?: string;
}


const RequestAbsence: React.FC<IRequestAbsenceProps> = (props) => {
    const { user, sp, onUpdate} = props;
    const [ newAbsence, setNewAbsence ] = useState<IAbsence>({
        Id: 0,
        Employee: { Id: user.Id, Title: user.Title },
        AbsenceType: '',
        From: new Date(),
        To: new Date(),
        Notes: '',
        NoteForLeader: '',
        Approved: false,
        Title: '',
        Approvee: {Id: 0, Title: ''}
    });
    const [ errors, setErrors ] = useState<IAbsenceValidationErrors>({});
    const [ absenceTypeOptions, setAbsenceTypeOptions ] = useState<IDropdownOption[]>([]);


    const getValidLeader = async (): Promise<IContact> => {
        try {
            const directLeader: any = user.Leader || user.BackupLeader; // eslint-disable-line @typescript-eslint/no-explicit-any
            if (directLeader) {
                return {
                    ...directLeader,
                    Id: directLeader.ID,
                };
            }

            // 2. If no direct leader, fall back to the department leader logic.
            const departmentLeaderInfo = await getLeaderInfo(sp, user);
            return departmentLeaderInfo;
        } catch (exception) {
            console.error("Couldnt get any leader! " + exception);
            return {Id: 0, Title: ''};   
        }
    }


    const addAbsence = async (): Promise<void> => {
        try {
            const list = sp.web.lists.getByTitle("Absence");
            // When adding an item with a lookup field, you must use the 'FieldNameId' syntax.
            const bossMan: IContact = await getValidLeader();
            console.log(bossMan);
            const itemToAdd = {
                EmployeeId: newAbsence.Employee.Id,
                ApproveeId: bossMan.Id,
                AbsenceType: newAbsence.AbsenceType,
                From: newAbsence.From,
                To: newAbsence.To,
                Notes: newAbsence.Notes,
                NoteForLeader: newAbsence.NoteForLeader,
            };
            await list.items.add(itemToAdd);
            //Need to request approval after being created
            //Email Leader if he isnt absent, else email backup leader
            // if person doesnt have a leader themselves, look into department leader
        } catch (exception) {
            console.error("Error adding absence: ", exception);
        }
    }

    const fetchAbsenceTypes = async (): Promise<void> => {
        try {
            // Assumes your list is named 'Absences' and the choice field is 'AbsenceType'
            const list = sp.web.lists.getByTitle("Absence");
            const field: IFieldInfo = await list.fields.getByInternalNameOrTitle("AbsenceType")();

            if (field && field.Choices) {
                const options: IDropdownOption[] = field.Choices.map(choice => ({
                    key: choice,
                    text: choice
                }));
                setAbsenceTypeOptions(options);
            }
        } catch (error) {
            console.error("Error fetching absence types: ", error);
            setErrors(prev => ({ ...prev, absenceType: "Could not load absence types." }));
        }
    }


    const handleSaveButton = async (): Promise<void> => {
        const validationErrors: IAbsenceValidationErrors = {};

        // --- Validation ---
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set to midnight to compare dates only

        if (!newAbsence.AbsenceType) {
            validationErrors.absenceType = 'Please select an absence type.';
        }

        if (newAbsence.To < today) {
            validationErrors.to = "The 'To' date cannot be in the past.";
        }

        if (newAbsence.From < today) {
            validationErrors.from = "The 'From' date cannot be in the past.";
        }

        if (newAbsence.To < newAbsence.From) {
            validationErrors.to = "The 'To' date cannot be before the 'From' date.";
        }

        setErrors(validationErrors);
        
        
        

        if (Object.keys(validationErrors).length > 0) {
            return;
        }
        // --- End of Validation ---

        await addAbsence();

        onUpdate();
    }    
    

    const handleCloseButton = (): void => {
        onUpdate();
    }


    const onAbsenceTypeChange = (event: React.FormEvent<HTMLDivElement>, option?: IDropdownOption): void => {
        if (option) {
            setErrors(prev => ({ ...prev, absenceType: undefined }));
            setNewAbsence(prev => ({ ...prev, AbsenceType: option.text }));
        }
    }

    const onToChange = (date: Date | null | undefined): void => {
        if (date) {
            setErrors(prev => ({ ...prev, to: undefined }));
            setNewAbsence(prev => ({ ...prev, To: date }));
        }
    }

    const onFromChange = (date: Date | null | undefined): void => {
        if (date) {
            setErrors(prev => ({ ...prev, from: undefined }));
            setNewAbsence(prev => ({ ...prev, From: date }));
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
            fetchAbsenceTypes().catch(console.error);
        }
    }, [sp]);

    
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
                        onSelectDate={onFromChange} />
                    {errors.from && <p className={styles.errorMessage}>{errors.from}</p>}
                    {/* TODO: Add radio buttons for full/half day */}
                </div>
                <div className={styles.dateRow}>
                    <DatePicker
                        className={styles.datePicker}
                        firstDayOfWeek={DayOfWeek.Monday}
                        ariaLabel='Select an end date'
                        label='To'
                        strings={CzechDatePickerStrings}
                        value={newAbsence.To}
                        onSelectDate={onToChange} />
                    {errors.to && <p className={styles.errorMessage}>{errors.to}</p>}
                    {/* TODO: Add radio buttons for full/half day */}
                </div>
                <TextField label='Note for CoHe' multiline rows={3} onChange={onNoteChange} />
                <TextField label='Note for leader' multiline rows={3} onChange={onNoteForLeaderChange} />
            </div>
            <div className={styles.actionsContainer}>
                <PrimaryButton
                    text='Submit'
                    style={{ marginRight: '8px' }} 
                    onClick={handleSaveButton} />
                <DefaultButton text='Cancel' onClick={handleCloseButton} />
            </div>
        </div>
  );

}


export default RequestAbsence;