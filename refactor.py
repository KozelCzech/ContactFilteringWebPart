import os
import re

file_path = r"c:\Users\kopacek\Desktop\WorkProjects\ContactFilteringWebPart\src\webparts\contactFiltering\components\absences\requestAbsence\RequestAbsence.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Imports
if "SpinnerSize" not in content:
    content = content.replace(
        "import { DatePicker, DayOfWeek, DefaultButton, Dropdown, IDropdownOption, PrimaryButton, TextField, IChoiceGroupOption, ChoiceGroup, TimePicker } from '@fluentui/react';",
        "import { DatePicker, DayOfWeek, DefaultButton, Dropdown, IDropdownOption, PrimaryButton, TextField, IChoiceGroupOption, ChoiceGroup, TimePicker, Spinner, SpinnerSize } from '@fluentui/react';"
    )

# 2. TimeSelectionType enum
if "export enum TimeSelectionType" not in content:
    content = content.replace(
        "type TimeSelectionType = 'FullDay' | 'HalfDayAM' | 'HalfDayPM' | 'Hourly';",
        "export enum TimeSelectionType {\n    FullDay = 'FullDay',\n    HalfDayAM = 'HalfDayAM',\n    HalfDayPM = 'HalfDayPM',\n    Hourly = 'Hourly'\n}"
    )

# 3. State update
content = content.replace(
    "const [startDayTimeType, setStartDayTimeType] = useState<TimeSelectionType>('FullDay');",
    "const [startDayTimeType, setStartDayTimeType] = useState<TimeSelectionType>(TimeSelectionType.FullDay);"
)
if "const [isLoading, setIsLoading]" not in content:
    content = content.replace(
        "const [isSubmitting, setIsSubmitting] = useState<boolean>(false);",
        "const [isSubmitting, setIsSubmitting] = useState<boolean>(false);\n    const [isLoading, setIsLoading] = useState<boolean>(true);"
    )

# 4. timeTypeOptions
if "TimeSelectionType.FullDay" not in content:
    content = content.replace(
        """    const timeTypeOptions: IChoiceGroupOption[] = [
        { key: 'FullDay', text: 'Celý den' },
        { key: 'HalfDayAM', text: 'Dopoledne (AM)' },
        { key: 'HalfDayPM', text: 'Odpoledne (PM)' },
        { key: 'Hourly', text: 'Hodinový' },
    ];""",
        """    const timeTypeOptions: IChoiceGroupOption[] = [
        { key: TimeSelectionType.FullDay, text: 'Celý den' },
        { key: TimeSelectionType.HalfDayAM, text: 'Dopoledne (AM)' },
        { key: TimeSelectionType.HalfDayPM, text: 'Odpoledne (PM)' },
        { key: TimeSelectionType.Hourly, text: 'Hodinový' },
    ];"""
    )
elif "TimeSelectionType.FullDay" in content.split("""    const timeTypeOptions: IChoiceGroupOption[] = [""")[1]:
    pass
else: # If we need to replace and the first check didn't hit
    pass

# 5. startDayTimeType logic checks
content = content.replace("'FullDay'", "TimeSelectionType.FullDay")
content = content.replace("'HalfDayAM'", "TimeSelectionType.HalfDayAM")
content = content.replace("'HalfDayPM'", "TimeSelectionType.HalfDayPM")
content = content.replace("'Hourly'", "TimeSelectionType.Hourly")

# 6. Improved Data Caching in handleSaveButton
content = content.replace(
    "const absenceTypesLocal = await fetchAbsenceTypes(sp);\n\n            const currentType = absenceTypesLocal.find(type => type.Id === newAbsence.AbsenceType.Id);",
    "const currentType = absenceTypes.find(type => type.Id === newAbsence.AbsenceType.Id);"
)

# 7. Loading state useEffect
old_use_effect_1 = """    useEffect(() => {
        if (sp) {

            fetchAbsenceTypes(sp)
                .then(types => {
                    setAbsenceTypes(types);
                })
                .catch(error => {
                    console.error("Error fetching absence types: ", error);
                    setErrors(prev => ({ ...prev, absenceType: "Could not load absence types." }));
                });

            isUserInGroup(props.sp, "delegatedAbsences").then(result => {
                setDelegatedAbsence(result);
            }).catch(error => console.error("Error fetching user email:", error));
        }
    }, [sp]);


    useEffect(() => {
        getMainCommitment(user.Id).then(commitment => {
            if (commitment) {
                setMainCommitment(commitment);
            }
        }).catch(console.error);
    }, [sp, user])"""

old_use_effect_2 = """    useEffect(() => {
        fetchAllUsers(sp).then(users => {
            setAllUsers(users);
        }).catch(console.error);
    }, [user, delegatedAbsence]);"""

new_use_effect = """    useEffect(() => {
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
    }, [sp, user]);"""

content = content.replace(old_use_effect_1, new_use_effect)
content = content.replace(old_use_effect_2, "")

# 8. Render block breakdown and Loading view
old_render = r"""    return (
        <div className={styles.requestAbsence}>
            <h3 className={styles.title}>Žádost o nepřítomnost</h3>
            <div className={styles.formContainer}>
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
                        <div style={{ display: 'flex', gap: '10px' }}>
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
                <TextField label='Poznámka pro CoHe' multiline rows={3} onChange={onNoteChange} />
                <TextField label='Poznámka pro nadřízeného' multiline rows={3} onChange={onNoteForLeaderChange} />
            </div>
            {errors.pto && <p className={styles.errorMessage}>{errors.pto}</p>}
            <p>{mainCommitment?.MainCommitment}</p>
            <div className={styles.actionsContainer} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ marginRight: 'auto', fontWeight: 'bold' }}>
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
    );"""

new_render = r"""    const renderUserAndTypeSelector = () => (
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

    const renderDateRangeSelector = () => (
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
    );"""

content = content.replace(old_render, new_render)

# Small fix if any 'FullDay' strings were replaced wrongly - no, because I only replaced standard ones.
# Write back
with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"Refactoring complete! Length: {len(content)}")
