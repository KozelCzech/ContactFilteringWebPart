import { IContact } from "../../models/IContact";


export interface IAbsence {
    Id: number;
    Title: string;
    Employee: IContact;
    AbsenceType: string;
    To: Date;
    From: Date;
    Notes: string;
    NoteForLeader: string;
    Approved: boolean;
    Approvee: IContact;
}