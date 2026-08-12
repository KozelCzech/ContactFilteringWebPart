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

    // Ensure only the one required list exists and obtain its ID
    await ensureList(SP_LISTS.ContactFilteringTest, "List of Contacts");

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
      { name: "company", addFn: () => contactList.fields.addText("company") },
      { name: "department", addFn: () => contactList.fields.addText("department") },
      { name: "displayName", addFn: () => contactList.fields.addText("displayName") },
      { name: "displayNamePrintable", addFn: () => contactList.fields.addText("displayNamePrintable") },
      { name: "givenName", addFn: () => contactList.fields.addText("givenName") },
      { name: "homePhone", addFn: () => contactList.fields.addText("homePhone") },
      { name: "l", addFn: () => contactList.fields.addText("l") },
      { name: "mail", addFn: () => contactList.fields.addText("mail") },
      { name: "name", addFn: () => contactList.fields.addText("name") },
      { name: "otherHomePhone", addFn: () => contactList.fields.addText("otherHomePhone") },
      { name: "pager", addFn: () => contactList.fields.addText("pager") },
      { name: "physicalDeliveryOfficeName", addFn: () => contactList.fields.addText("physicalDeliveryOfficeName") },
      { name: "roomNumber", addFn: () => contactList.fields.addText("roomNumber") },
      { name: "sn", addFn: () => contactList.fields.addText("sn") },
      { name: "telephoneNumber", addFn: () => contactList.fields.addText("telephoneNumber") },
      { name: "mobile", addFn: () => contactList.fields.addText("mobile") },
      { name: "manager", addFn: () => contactList.fields.addText("manager") },
      { name: "Image", addFn: () => contactList.fields.addText("Image") },
      { name: "upn", addFn: () => contactList.fields.addText("upn") }
    ]);

    console.log("List provisioning completed successfully.");
  } catch (error) {
    console.error("Error during list provisioning: ", error);
  }
};
