import { SPFI } from "@pnp/sp";

export interface IContactFilteringProps {
  sp: SPFI;
  description: string;
  webAbsoluteUrl: string;
  isDarkTheme: boolean;
  environmentMessage: string;
  hasTeamsContext: boolean;
  userDisplayName: string;
}
