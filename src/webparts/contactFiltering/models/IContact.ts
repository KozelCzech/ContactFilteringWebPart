export interface IContact {
    Id: number;
    ID?: number; // SharePoint lookups often return 'ID' (all caps)
    company?: string;
    department?: string;
    displayName?: string;
    displayNamePrintable?: string;
    givenName?: string;
    homePhone?: string;
    l?: string;
    mail?: string;
    name?: string;
    otherHomePhone?: string;
    pager?: string;
    physicalDeliveryOfficeName?: string;
    roomNumber?: string;
    sn?: string;
    telephoneNumber?: string;
    mobile?: string;
    manager?: string;
    Image?: string;
    upn?: string;
}
