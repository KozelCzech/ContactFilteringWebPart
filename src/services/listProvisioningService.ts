import { SPFI } from "@pnp/sp";
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/fields";
import { SP_LISTS } from "./spConstants";

export const provisionLists = async (sp: SPFI): Promise<void> => {
  try {
    const ensureList = async (title: string, description: string): Promise<string> => {
      try {
        const list = await sp.web.lists.getByTitle(title).select("Id")();
        if (list && list.Id) {
          return list.Id;
        }
      } catch {
        // List does not exist yet via getByTitle
      }
      try {
        console.log(`Provisioning list: ${title}...`);
        const result = await sp.web.lists.add(title, description, 100);
        return result.Id;
      } catch {
        const list = await sp.web.lists.getByTitle(title).select("Id")();
        return list.Id;
      }
    };

    try {
      await ensureList(SP_LISTS.ContactFilteringTest, "List of Contacts");
    } catch (e) {
      console.warn("ensureList encountered an issue: ", e);
    }

    const ensureFieldsForList = async (listTitle: string, fieldsToEnsure: { name: string, addFn: () => Promise<unknown> }[]): Promise<void> => {
      try {
        const list = sp.web.lists.getByTitle(listTitle);
        const fields = await list.fields.select("InternalName").top(5000)();
        const internalNames = fields.map(f => f.InternalName);

        for (const field of fieldsToEnsure) {
          if (!internalNames.includes(field.name)) {
            try {
              console.log(`Adding field ${field.name} to list ${listTitle}...`);
              await field.addFn();
            } catch (fieldErr) {
              console.warn(`Could not add field ${field.name} to list ${listTitle}: `, fieldErr);
            }
          }
        }
      } catch (err) {
        console.warn(`ensureFieldsForList failed for list ${listTitle}: `, err);
      }
    };

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
      { name: "otherMobile", addFn: () => contactList.fields.addText("otherMobile") },
      { name: "manager", addFn: () => contactList.fields.addText("manager") },
      { name: "Image", addFn: () => contactList.fields.addText("Image") },
      { name: "upn", addFn: () => contactList.fields.addText("upn") },
      { name: "titlead", addFn: () => contactList.fields.addText("titlead") },
      { name: "function", addFn: () => contactList.fields.addText("function") }
    ]);

    console.log("List provisioning completed successfully.");
  } catch (error) {
    console.error("Error during list provisioning: ", error);
  }
};
