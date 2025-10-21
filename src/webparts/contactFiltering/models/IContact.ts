import { ITag } from '../components/tagFolder/TagHolder';

export interface IContact {
    Id: number;
    ID?: number; // SharePoint lookups often return 'ID' (all caps)
    Title?: string;
    FirstName?: string;
    LastName?: string;
    Department?: string;
    Image?: string;
    PhoneNumber?: string;
    Email?: string;
    Tags?: ITag[];
    Leader?: IContact;
    BackupLeader?: IContact;
}
