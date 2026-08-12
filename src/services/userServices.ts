import { SPFI } from "@pnp/sp";
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/items";
import { SP_LISTS } from "./spConstants";

export const fetchUniqueDepartments = async (sp: SPFI): Promise<string[]> => {
    try {
        const items = await sp.web.lists.getByTitle(SP_LISTS.ContactFilteringTest).items.select("department")();
        const depts = items.map(item => item.department).filter(Boolean);
        return Array.from(new Set(depts));
    } catch (e) {
        console.error("Error fetching unique departments: ", e);
        return [];
    }
};
