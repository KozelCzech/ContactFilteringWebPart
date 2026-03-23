import { GraphFI } from "@pnp/graph";
import "@pnp/graph/users";
import "@pnp/graph/mail";
import "@pnp/graph/mail/messages";
import { Message } from "@microsoft/microsoft-graph-types";
import { IContact } from "../webparts/contactFiltering/models/IContact";
import { fetchUserById } from "./userUtils";
import { SPFI } from "@pnp/sp";
import { IAbsence } from "../webparts/contactFiltering/components/absences/AbsenceInterfaces";

export type requestType = "Created" | "Updated" | "Deleted";

/**
 * Sends an absence notification email using Microsoft Graph.
 * @param graph The initialized GraphFI instance from your main component
 */
export const sendAbsenceEmail = async (
    graph: GraphFI, 
    sp: SPFI,
    user: IContact, 
    absence: IAbsence, 
    reqType: requestType
): Promise<void> => {
    try {
        const recipient: IContact = await fetchUserById(sp, user.Id);
        const recipientEmail = recipient.Email || ""; 
        if (!recipientEmail) {
            console.error("Recipient has no email address.");
            return;
        }

        let subjectText = "";
        let bodyAction = "";

        switch (reqType) {
            case "Created":
                subjectText = `Žádost o absenci | ${recipient.FirstName} ${recipient.LastName} - ${absence.AbsenceType.Title} - Od: ${absence.From} Do: ${absence.To}`;
                bodyAction = "vytvořil(a) novou žádost o";
                break;
            case "Updated":
                subjectText = `Úprava absence | ${recipient.FirstName} ${recipient.LastName} - ${absence.AbsenceType.Title} - Od: ${absence.From} Do: ${absence.To}`;
                bodyAction = "upravil(a) žádost o";
                break;
            case "Deleted":
                subjectText = `Smazání absence | ${recipient.FirstName} ${recipient.LastName} - Od: ${absence.From} Do: ${absence.To}`;
                bodyAction = "požádal(a) o smazání";
                break;
        }

        const emailBody = `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #333;">
                <h2 style="color: #0078d4;">Oznámení o absenci</h2>
                <p>Dobrý den,</p>
                <p>Uživatel <strong>${recipient.FirstName} ${recipient.LastName}</strong> právě ${bodyAction} <strong>${absence.AbsenceType.Title}</strong> (od <strong>${absence.From}</strong> do <strong>${absence.To}</strong>).</p>
                <p>Prosím, zkontrolujte detaily a proveďte schválení v aplikaci.</p>
                <br />
                <a href="https://handj.sharepoint.com/sites/NpiDemo/"  
                   style="background-color: #0078d4; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">
                   Otevřít aplikaci
                </a>
                <p style="font-size: 0.8em; color: #666; margin-top: 30px;">
                    Toto je automatická zpráva.
                </p>
            </div>
        `;

        const draftMessage: Message = {
            subject: subjectText,
            importance: "normal",
            body: {
                contentType: "html",
                content: emailBody,
            },
            toRecipients: [
                {
                    emailAddress: {
                        address: recipientEmail,
                    },
                },
            ],
        };

        // Modern Microsoft Graph mail structure
        await graph.me.sendMail(draftMessage);

        console.log("Email successfully sent via Graph to: " + recipientEmail);

    } catch (error) {
        console.error("Graph Email failed to send: ", error);
    }
};


export type responseStatus = "Approved" | "Rejected" | "DeletionConfirmed" | "DeletionRejected";

/**
 * Sends a notification to the employee regarding the leader's decision.
 */
export const sendAbsenceResponseEmail = async (
    graph: GraphFI, 
    user: IContact, 
    absence: IAbsence, 
    status: responseStatus
): Promise<void> => {
    try {
        const recipientEmail = user.Email || ""; 
        if (!recipientEmail) {
            console.error("Recipient has no email address.");
            return;
        }

        let subjectText = "";
        let statusText = "";
        let color = "#0078d4"; // Standard Blue

        switch (status) {
            case "Approved":
                subjectText = `Schváleno: ${absence.AbsenceType.Title} (Od: ${absence.From} Do: ${absence.To})`;
                statusText = `Vaše žádost o <strong>${absence.AbsenceType.Title}</strong> (od <strong>${absence.From}</strong> do <strong>${absence.To}</strong>) byla <strong>schválena</strong>.`;
                color = "#107c10"; // Green
                break;
            case "Rejected":
                subjectText = `Zamítnuto: ${absence.AbsenceType.Title} (Od: ${absence.From} Do: ${absence.To})`;
                statusText = `Vaše žádost o <strong>${absence.AbsenceType.Title}</strong> (od <strong>${absence.From}</strong> do <strong>${absence.To}</strong>) byla <strong>zamítnuta</strong>.`;
                color = "#a4262c"; // Red
                break;
            case "DeletionConfirmed":
                subjectText = `Smazání potvrzeno: ${absence.AbsenceType.Title} (Od: ${absence.From} Do: ${absence.To})`;
                statusText = `Vaše žádost o <strong>smazání</strong> záznamu (${absence.AbsenceType.Title} od <strong>${absence.From}</strong> do <strong>${absence.To}</strong>) byla <strong>schválena</strong> a záznam byl odstraněn.`;
                color = "#5c2d91"; // Purple
                break;
            case "DeletionRejected":
                subjectText = `Smazání zamítnuto: ${absence.AbsenceType.Title} (Od: ${absence.From} Do: ${absence.To})`;
                statusText = `Vaše žádost o <strong>smazání</strong> záznamu (${absence.AbsenceType.Title} od <strong>${absence.From}</strong> do <strong>${absence.To}</strong>) byla <strong>zamítnuta</strong>. Záznam v evidenci zůstává.`;
                color = "#d13438"; // Darker Red/Orange
                break;
        }

        const emailBody = `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #333; max-width: 600px; border: 1px solid #eee; padding: 20px; border-top: 5px solid ${color};">
                <h2 style="color: ${color};">${subjectText}</h2>
                <p>Dobrý den,</p>
                <p>${statusText}</p>
                <p>Aktuální stav své docházky můžete sledovat v portálu [Jméno portálu].</p>
                <br />
                <a href="https://handj.sharepoint.com/sites/NpiDemo/"  
                   style="background-color: ${color}; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: 600;">
                   Otevřít aplikaci
                </a>
                <hr style="margin-top: 30px; border: 0; border-top: 1px solid #eee;" />
                <p style="font-size: 0.8em; color: #666;">
                    Toto je automatické systémové oznámení z portálu NPI.
                </p>
            </div>
        `;

        const responseMessage: Message = {
            subject: subjectText,
            importance: "normal",
            body: {
                contentType: "html",
                content: emailBody,
            },
            toRecipients: [
                {
                    emailAddress: {
                        address: recipientEmail,
                    },
                },
            ],
        };

        await graph.me.sendMail(responseMessage);
        console.log(`Response email (${status}) sent to: ${recipientEmail}`);

    } catch (error) {
        console.error("Failed to send response email: ", error);
    }
};