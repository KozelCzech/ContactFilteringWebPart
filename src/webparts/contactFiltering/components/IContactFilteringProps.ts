import { SPFI } from "@pnp/sp";

export interface IContactFilteringProps {
  sp: SPFI;
  description: string;
  webAbsoluteUrl: string;
  userDisplayName: string;
}
