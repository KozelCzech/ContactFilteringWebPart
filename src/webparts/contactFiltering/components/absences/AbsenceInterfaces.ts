import { IContact } from "../../models/IContact";


export interface IAbsenceType {
    Id: number;
    Title: string;
    TakesPTO?: boolean;
    FinancialStatement?: boolean;
}


export interface IAbsence {
    Id: number;
    Title: string;
    Employee: IContact;
    AbsenceType: IAbsenceType;
    To: Date;
    From: Date;
    Notes: string;
    NoteForLeader: string;
    Approved: boolean;
    Approvee: IContact;
    TimeType: string;
    HoursUsed: number;
    FirstMonth?: number;
    SecondMonth?: number;
}