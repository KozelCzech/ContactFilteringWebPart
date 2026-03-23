export interface IContact {
    Id: number;
    ID?: number; // SharePoint lookups often return 'ID' (all caps)
    Title?: string;
    FirstName?: string;
    LastName?: string;
    Image?: string;
    PhoneNumber?: string;
    Email?: string;
    Leader?: IContact;
    BackupLeader?: IContact;
    TimeOffHours?: number;
}
