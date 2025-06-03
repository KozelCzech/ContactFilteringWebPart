import { SPFI } from "@pnp/sp";

export interface IContactFilteringProps {
  sp: SPFI;
  description: string;
  isDarkTheme: boolean;
  environmentMessage: string;
  hasTeamsContext: boolean;
  userDisplayName: string;
}
