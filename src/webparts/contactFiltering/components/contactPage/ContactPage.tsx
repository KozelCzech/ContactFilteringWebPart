import * as React from 'react';
import styles from './ContactPage.module.scss'; // Your SCSS styles
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/items";
import { IContact } from '../../models/IContact';
import { SPFI } from '@pnp/sp';
import { Icon } from '@fluentui/react';
import { SP_LISTS } from '../../../../services/spConstants';

export interface IContactPageProps {
    contact: IContact;
    webAbsoluteUrl: string;
    sp: SPFI;
}

const ContactPage: React.FC<IContactPageProps> = (props) => {
    const { contact, webAbsoluteUrl } = props;

    const listName = SP_LISTS.ContactFilteringTest;
    const attachmentId = contact.Id;
    let attachmentUrl = "";

    try {
        if (contact.Image) {
            const trimmed = contact.Image.trim();
            if (trimmed.startsWith("{")) {
                const parsed = JSON.parse(trimmed);
                if (parsed.serverRelativeUrl) {
                    attachmentUrl = parsed.serverRelativeUrl;
                } else if (parsed.fileName) {
                    attachmentUrl = `${webAbsoluteUrl}/Lists/${listName}/Attachments/${attachmentId}/${parsed.fileName}`;
                }
            } else {
                attachmentUrl = trimmed;
            }
        }
    } catch (e) {
        console.error("Error parsing contact image: ", e);
    }

    const nameToDisplay = contact.displayName || contact.name || `${contact.givenName || ""} ${contact.sn || ""}`.trim() || "No Name";

    return (
        <div className={styles.contactPage}>
            <div className={styles.header}>
                <div className={styles.imageWrapper}>
                    {attachmentUrl ? (
                        <img
                            src={attachmentUrl}
                            className={styles.contactImage}
                            alt={nameToDisplay}
                        />
                    ) : (
                        <div className={styles.avatarPlaceholderLarge}>
                            {nameToDisplay.charAt(0).toUpperCase()}
                        </div>
                    )}
                </div>
                <div className={styles.headerText}>
                    <h2 className={styles.fullName}>{nameToDisplay}</h2>
                    {contact.displayNamePrintable && (
                        <span className={styles.printableName}>({contact.displayNamePrintable})</span>
                    )}
                    <div className={styles.workTitle}>
                        {contact.department && <span className={styles.departmentName}>{contact.department}</span>}
                        {contact.department && contact.company && <span className={styles.separator}> • </span>}
                        {contact.company && <span className={styles.companyName}>{contact.company}</span>}
                    </div>
                </div>
            </div>

            <div className={styles.infoGrid}>
                {/* Contact Section */}
                <div className={styles.infoSection}>
                    <h3 className={styles.sectionTitle}>
                        <Icon iconName="ContactInfo" className={styles.sectionIcon} />
                        Kontaktní údaje
                    </h3>
                    <div className={styles.sectionContent}>
                        {contact.mail && (
                            <div className={styles.infoRow}>
                                <span className={styles.infoLabel}>Email:</span>
                                <a href={`mailto:${contact.mail}`} className={styles.infoValue}>
                                    <Icon iconName="Mail" className={styles.rowIcon} /> {contact.mail}
                                </a>
                            </div>
                        )}
                        {contact.upn && (
                            <div className={styles.infoRow}>
                                <span className={styles.infoLabel}>UPN:</span>
                                <span className={styles.infoValue}>
                                    <Icon iconName="People" className={styles.rowIcon} /> {contact.upn}
                                </span>
                            </div>
                        )}
                        {contact.mobile && (
                            <div className={styles.infoRow}>
                                <span className={styles.infoLabel}>Mobil:</span>
                                <span className={styles.infoValue}>
                                    <Icon iconName="CellPhone" className={styles.rowIcon} /> {contact.mobile}
                                </span>
                            </div>
                        )}
                        {contact.telephoneNumber && (
                            <div className={styles.infoRow}>
                                <span className={styles.infoLabel}>Telefon do práce:</span>
                                <span className={styles.infoValue}>
                                    <Icon iconName="Phone" className={styles.rowIcon} /> {contact.telephoneNumber}
                                </span>
                            </div>
                        )}
                        {contact.homePhone && (
                            <div className={styles.infoRow}>
                                <span className={styles.infoLabel}>Domácí telefon:</span>
                                <span className={styles.infoValue}>
                                    <Icon iconName="Home" className={styles.rowIcon} /> {contact.homePhone}
                                </span>
                            </div>
                        )}
                        {contact.otherHomePhone && (
                            <div className={styles.infoRow}>
                                <span className={styles.infoLabel}>Jiný domácí tel.:</span>
                                <span className={styles.infoValue}>
                                    <Icon iconName="Specialist" className={styles.rowIcon} /> {contact.otherHomePhone}
                                </span>
                            </div>
                        )}
                        {contact.pager && (
                            <div className={styles.infoRow}>
                                <span className={styles.infoLabel}>Pager:</span>
                                <span className={styles.infoValue}>
                                    <Icon iconName="BidiLtr" className={styles.rowIcon} /> {contact.pager}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Organization & Location Section */}
                <div className={styles.infoSection}>
                    <h3 className={styles.sectionTitle}>
                        <Icon iconName="Org" className={styles.sectionIcon} />
                        Organizace & Umístění
                    </h3>
                    <div className={styles.sectionContent}>
                        {contact.manager && (
                            <div className={styles.infoRow}>
                                <span className={styles.infoLabel}>Manažer:</span>
                                <span className={styles.infoValue}>
                                    <Icon iconName="DietHeroSingle" className={styles.rowIcon} /> {contact.manager}
                                </span>
                            </div>
                        )}
                        {contact.l && (
                            <div className={styles.infoRow}>
                                <span className={styles.infoLabel}>Lokalita (Město):</span>
                                <span className={styles.infoValue}>
                                    <Icon iconName="MapPin" className={styles.rowIcon} /> {contact.l}
                                </span>
                            </div>
                        )}
                        {contact.physicalDeliveryOfficeName && (
                            <div className={styles.infoRow}>
                                <span className={styles.infoLabel}>Kancelář:</span>
                                <span className={styles.infoValue}>
                                    <Icon iconName="OfficeBuilding" className={styles.rowIcon} /> {contact.physicalDeliveryOfficeName}
                                </span>
                            </div>
                        )}
                        {contact.roomNumber && (
                            <div className={styles.infoRow}>
                                <span className={styles.infoLabel}>Číslo místnosti:</span>
                                <span className={styles.infoValue}>
                                    <Icon iconName="Room" className={styles.rowIcon} /> {contact.roomNumber}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Personal Section */}
                <div className={styles.infoSectionFull}>
                    <h3 className={styles.sectionTitle}>
                        <Icon iconName="Personalize" className={styles.sectionIcon} />
                        Osobní údaje
                    </h3>
                    <div className={styles.personalDetailsGrid}>
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>Křestní jméno:</span>
                            <span className={styles.infoValue}>{contact.givenName || "-"}</span>
                        </div>
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>Příjmení:</span>
                            <span className={styles.infoValue}>{contact.sn || "-"}</span>
                        </div>
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>Celé jméno:</span>
                            <span className={styles.infoValue}>{contact.name || "-"}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ContactPage;