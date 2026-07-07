import { SPFI } from "@pnp/sp";
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/fields";
import { SP_LISTS } from "./spConstants";

export const provisionLists = async (sp: SPFI): Promise<void> => {
  try {
    // 1. Get all existing lists in a single OData call
    const existingLists = await sp.web.lists.select("Title", "Id")();
    const existingListTitles = existingLists.map(l => l.Title);

    // Helper to get list ID, creating it if it doesn't exist
    const ensureList = async (title: string, description: string): Promise<string> => {
      const idx = existingListTitles.indexOf(title);
      if (idx >= 0) {
        return existingLists[idx].Id;
      }
      console.log(`Provisioning list: ${title}...`);
      const result = await sp.web.lists.add(title, description, 100);
      return result.Id;
    };

    // Ensure the 4 required lists exist and obtain their IDs
    const contactFilteringTestId = await ensureList(SP_LISTS.ContactFilteringTest, "List of Contacts");
    const oddeleniId = await ensureList(SP_LISTS.Oddeleni, "List of Departments");
    const poziceId = await ensureList(SP_LISTS.Pozice, "List of Positions");
    await ensureList(SP_LISTS.Uvazky, "List of Commitments");

    // Helper to add missing fields in a single query check per list
    const ensureFieldsForList = async (listTitle: string, fieldsToEnsure: { name: string, addFn: () => Promise<unknown> }[]): Promise<void> => {
      const list = sp.web.lists.getByTitle(listTitle);
      const fields = await list.fields.select("InternalName")();
      const internalNames = fields.map(f => f.InternalName);

      for (const field of fieldsToEnsure) {
        if (!internalNames.includes(field.name)) {
          console.log(`Adding field ${field.name} to list ${listTitle}...`);
          await field.addFn();
        }
      }
    };

    // 2. Provision fields for ContactFilteringTest
    const contactList = sp.web.lists.getByTitle(SP_LISTS.ContactFilteringTest);
    await ensureFieldsForList(SP_LISTS.ContactFilteringTest, [
      { name: "FirstName", addFn: () => contactList.fields.addText("FirstName") },
      { name: "LastName", addFn: () => contactList.fields.addText("LastName") },
      { name: "Email", addFn: () => contactList.fields.addText("Email") },
      { name: "PhoneNumber", addFn: () => contactList.fields.addText("PhoneNumber") },
      { name: "Image", addFn: () => contactList.fields.addText("Image") },
      { name: "TimeOffHours", addFn: () => contactList.fields.addNumber("TimeOffHours") },
      { name: "Leader", addFn: () => contactList.fields.addLookup("Leader", { LookupListId: contactFilteringTestId, LookupFieldName: "Title" }) },
      { name: "BackupLeader", addFn: () => contactList.fields.addLookup("BackupLeader", { LookupListId: contactFilteringTestId, LookupFieldName: "Title" }) }
    ]);

    // 3. Provision fields for Oddeleni (Departments)
    const oddeleniList = sp.web.lists.getByTitle(SP_LISTS.Oddeleni);
    await ensureFieldsForList(SP_LISTS.Oddeleni, [
      { name: "UniqueCode", addFn: () => oddeleniList.fields.addNumber("UniqueCode") },
      { name: "Location", addFn: () => oddeleniList.fields.addText("Location") },
      { name: "Leader", addFn: () => oddeleniList.fields.addLookup("Leader", { LookupListId: contactFilteringTestId, LookupFieldName: "Title" }) },
      { name: "LeaderDepartment", addFn: () => oddeleniList.fields.addLookup("LeaderDepartment", { LookupListId: oddeleniId, LookupFieldName: "Title" }) }
    ]);

    // 4. Provision fields for Pozice (Positions)
    const poziceList = sp.web.lists.getByTitle(SP_LISTS.Pozice);
    await ensureFieldsForList(SP_LISTS.Pozice, [
      { name: "Department", addFn: () => poziceList.fields.addLookup("Department", { LookupListId: oddeleniId, LookupFieldName: "Title" }) }
    ]);

    // 5. Provision fields for Uvazky (Commitments)
    const uvazkyList = sp.web.lists.getByTitle(SP_LISTS.Uvazky);
    await ensureFieldsForList(SP_LISTS.Uvazky, [
      { name: "Employee", addFn: () => uvazkyList.fields.addLookup("Employee", { LookupListId: contactFilteringTestId, LookupFieldName: "Title" }) },
      { name: "Position", addFn: () => uvazkyList.fields.addLookup("Position", { LookupListId: poziceId, LookupFieldName: "Title" }) },
      { name: "MainCommitment", addFn: () => uvazkyList.fields.addBoolean("MainCommitment") },
      { name: "From", addFn: () => uvazkyList.fields.addDateTime("From") },
      { name: "To", addFn: () => uvazkyList.fields.addDateTime("To") },
      { name: "WorkHoursPerDay", addFn: () => uvazkyList.fields.addNumber("WorkHoursPerDay") }
    ]);

    console.log("List provisioning completed successfully.");
  } catch (error) {
    console.error("Error during list provisioning: ", error);
  }
};
