import { ITag } from '../components/tagFolder/TagHolder';

export interface IContact {
    Id: number;
    Title?: string;
    FirstName?: string;
    LastName?: string;
    Department?: string;
    Image?: string;
    PhoneNumber?: string;
    Email?: string;
    Tags: { results: ITag[]; }
}
