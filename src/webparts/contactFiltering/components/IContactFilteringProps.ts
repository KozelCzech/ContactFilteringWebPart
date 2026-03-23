import { GraphFI } from "@pnp/graph";
import { SPFI } from "@pnp/sp";

export interface IContactFilteringProps {
  sp: SPFI;
  graph: GraphFI;
  description: string;
  webAbsoluteUrl: string;
  userDisplayName: string;
}
