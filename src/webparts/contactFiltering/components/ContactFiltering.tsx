import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import styles from './ContactFiltering.module.scss';
import type { IContactFilteringProps } from './IContactFilteringProps';
import {
  Dropdown,
  IDropdownOption,
  TextField,
  PrimaryButton,
  Image,
  ImageFit,
  Spinner,
  PivotItem
} from '@fluentui/react';
import { IContact } from '../models/IContact';
import ContactCard from './ContactCard';
//import TagHolder from './tagFolder/TagHolder';
import Modal from './subComponents/modal/Modal';
import Paginator from './subComponents/paginator/Paginator';
import AbsenceList from './absences/AbsenceList/AbsenceList';
import ContactPage from './contactPage/ContactPage';
import UserPage from './userPage/UserPage';
import RequestAbsence from './absences/requestAbsence/RequestAbsence';
import ApproveAbsence from './absences/approveAbsence/ApproveAbsence';
import TabsView from './subComponents/tabsView/tabsView';
import { fetchAllDepartments, fetchEmployeeIdsByDepartment } from '../../../services/userServices';
import { fetchAbsencesAwaitingApproval } from '../../../services/absenceServices';
import FinancialStatements from './absences/financialStatements/FinancialStatements';
import { createNewYearPTO } from '../../../services/ptoServices';
import { fetchCurrentUser, fetchContactByEmail, getContactItemsUrl } from '../../../services/contactServices';




const ContactFiltering: React.FC<IContactFilteringProps> = (props) => {
  const [contacts, setContacts] = useState<IContact[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  const [nameText, setNameText] = useState<string>("");
  const [phoneNumberText, setPhoneNumberText] = useState<string>("");
  const [emailText, setEmailText] = useState<string>("");
  const [departmentKey, setDepartmentKey] = useState<string | number>("");
  const [departmentOptions, setDepartmentOptions] = useState<IDropdownOption[]>([]);

  const [activeFilter, setActiveFilter] = useState<string>("");
  
  const [selectedContact, setSelectedContact] = useState<IContact | undefined>(undefined);
  //const [isTagCreator, setIsTagCreator] = useState<boolean>(false);

  const [pageUrls, setPageUrls] = useState<string[]>([]);
  const [currentPageNumber, setCurrentPageNumber] = useState<number>(0);
  const [hasNext, setHasNext] = useState<boolean>(false);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  const [ userModalOpen, setUserModalOpen ] = useState<boolean>(false);
  const [ currentUser, setCurrentUser] = useState<IContact>();

  const [ requestAbsenceModalOpen, setRequestAbsenceModalOpen ] = useState<boolean>(false);
  const [ approveAbsenceModalOpen, setApproveAbsenceModalOpen ] = useState<boolean>(false);
  const [ financialStatementsModalOpen, setFinancialStatementsModalOpen ] = useState<boolean>(false);

  const [ showApproveAbsence, setShowApproveAbsence ] = useState<boolean>(false);

  const listName: string = "ContactFilteringTest";
  
  // #region Contacts
  const createFilter = async(): Promise<void> => {
    const filterParts: string[] = [];
    const escapedNameText = nameText.replace(/'/g, "''");
    if (nameText.trim() !== "") {
      filterParts.push(`(substringof('${escapedNameText}', FirstName) or substringof('${escapedNameText}', LastName) or substringof('${escapedNameText}', Title))`);
    }
    const escapedPhoneNumberText = phoneNumberText.replace(/'/g, "''");
    if (phoneNumberText.trim() !== "") {
      filterParts.push(`(substringof('${escapedPhoneNumberText}', PhoneNumber))`);
    }
    const escapedEmailText = emailText.replace(/'/g, "''");
    if (emailText.trim() !== "") {
      filterParts.push(`(substringof('${escapedEmailText}', Email))`);
    }

    if (departmentKey) {
      const uniqueEmployeeIds = await fetchEmployeeIdsByDepartment(props.sp, departmentKey as number);

      if (uniqueEmployeeIds.length > 0) {
        const idFilter = uniqueEmployeeIds.map(id => `Id eq ${id}`).join(' or ');
        filterParts.push(`(${idFilter})`);
      } else {
        // If no employees are found for the department, create a filter that returns no results.
        // Using Id eq -1 is a common way to ensure no items are returned.
        const idFilter = 'Id eq -1';
        filterParts.push(`(${idFilter})`);
      }
    }

    const combinedFilter = filterParts.join(' and ');
    setActiveFilter(combinedFilter)
  }


  const createFullQuery = async(): Promise<string> => {
      const selectFields = [
        'Id', 'Title', 'FirstName', 'LastName', 'Image', 'PhoneNumber', 'Email', 
        "Leader/ID", "Leader/Title", "BackupLeader/ID", "BackupLeader/Title"
      ];
      const expandFields = ["Leader", "BackupLeader"];
      
      return getContactItemsUrl(props.sp, selectFields, activeFilter, itemsPerPage, expandFields);
  }


  const loadPageByUrl = useCallback(async (url: string) => {
    setIsLoading(true);
    try {
        const response = await fetch(url, {
            headers: { Accept: "application/json;odata=verbose" }
        });

        if (response.ok) {
            const data = await response.json();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const newItems: IContact[] = (data.d.results as any[]).map(contact => {
              return contact;
            });
            const nextUrl = data.d.__next;

            setContacts(newItems);
            setHasNext(!!nextUrl);
            setPageUrls(prevUrls => {
              const newUrls = [...prevUrls];
               if (nextUrl && !newUrls.includes(nextUrl)) {
                   newUrls[currentPageNumber + 1] = nextUrl;
               }
              return newUrls;
            });

        } else {
            throw new Error(`Error fetching data: ${response.statusText}`);
        }
    } catch (error) {
        console.error("Error loading page: ", error);
    } finally {
        setIsLoading(false);
    }
}, [props.sp]);


  const getFirstPage = async (): Promise<void> => {
    setIsLoading(true);
    try {
      
      const initialUrl = await createFullQuery();

      const cleanedUrl = `${props.webAbsoluteUrl}/${initialUrl}`;

      setCurrentPageNumber(0);
      setContacts([]);
      setPageUrls([cleanedUrl]);
      
      await loadPageByUrl(cleanedUrl);      
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // #endregion


  const fetchUser = async(): Promise<void> => {
    try {
      const user = await fetchCurrentUser(props.sp);
      const result = await fetchContactByEmail(props.sp, user.Email);
      setCurrentUser(result[0] as IContact);


    } catch (exception) {
      console.error("Error fetching user email: ", exception);
      return;
    }
  }
  




  // #region Inputs
  const onNameTextChange = (event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string): void => {
    setNameText(newValue || "");
  };


  const onPhoneNumberTextChange = (event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string): void => {
    setPhoneNumberText(newValue || "");
  };


  const onEmailTextChange = (event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string): void => {
    setEmailText(newValue || "");
  };

  const onDepartmentChange = (event: React.FormEvent<HTMLDivElement>, option?: IDropdownOption): void => {
    if (option) {
        setDepartmentKey(option.key);
    } else {
        setDepartmentKey("");
    }
  };


  const onClearFilterClick = useCallback(async (): Promise<void> => {
    setNameText("");
    setPhoneNumberText("");
    setEmailText("");
    setDepartmentKey("");
    
    setActiveFilter("");

    await getFirstPage();
  }, [getFirstPage]);


  const handleContactCardClick = (contact: IContact): void => {
    setSelectedContact(contact);
  };
  
  
  const handleCloseContactModal = (): void => {
    setSelectedContact(undefined);
  };
  
  
    const handleUserPageClick = (): void => {
      setUserModalOpen(true);
    };


    const handleCloseUserPageModal = (): void => {
      setUserModalOpen(false);
    }


    /*const handleUserPageUpdate = (): void => {
      setUserModalOpen(false);
    }*/


  const handleNext = (): void => {
        if (hasNext) {
            setCurrentPageNumber(currentPageNumber + 1);
        }
    }


    const handlePrevious = (): void => {
        if (currentPageNumber > 0) {
            setCurrentPageNumber(currentPageNumber - 1);
        }
    }


    const handleRequestAbsenceClick = (): void => {
      setRequestAbsenceModalOpen(true);
    }


    const handleRequestAbsenceUpdate = (): void => {
      setRequestAbsenceModalOpen(false);
    }

    const handleApproveAbsenceClick = (): void => {
      setApproveAbsenceModalOpen(true);
    }

    const handleApproveAbsenceUpdate = (): void => {
      setApproveAbsenceModalOpen(false);
    }

    const handleFinancialStatementsClick = (): void => {
      setFinancialStatementsModalOpen(true);
    }

    const handleFinancialStatementsUpdate = (): void => {
      setFinancialStatementsModalOpen(false);
    }


    const fetchUserImage = (): string => {
      try {
        const attachmentName = JSON.parse(currentUser?.Image || "").fileName;
        const attachmentUrl = `${props.webAbsoluteUrl}/Lists/${listName}/Attachments/${currentUser?.Id}/${attachmentName}`;
        return attachmentUrl;
      } catch (exception) {
        console.error(exception);
        return "";
      }
    }


    const approveAbsenceRequired = async (): Promise<void> => {
      if (currentUser) {
        const absencesToApprove = await fetchAbsencesAwaitingApproval(props.sp, currentUser);
        if (absencesToApprove.length > 0) {
          setShowApproveAbsence(true);
        } else {
          setShowApproveAbsence(false);
        }
      } else {
        setShowApproveAbsence(false);
      }
    }


  // #endregion
  
  useEffect(() => {
    const init = async (): Promise<void> => {
      console.log("Component did mount");
      await getFirstPage();
      //const tagCreatorStatus = await isUserInGroup("TagCreators");
      //setIsTagCreator(tagCreatorStatus);
      setItemsPerPage(10);

      fetchUser().catch(error => console.error("Error fetching user email:", error));

      fetchAllDepartments(props.sp).then(departments => {
        const options: IDropdownOption[] = departments.map(dep => ({ key: dep.UniqueCode, text: `${dep.UniqueCode} - ${dep.Title}`}));
        options.unshift({ key: "", text: "Všechna oddělení" });
        setDepartmentOptions(options);
      }).catch(error => console.error("Error fetching departments:", error));

      approveAbsenceRequired().catch(error => console.error("Error fetching user email:", error));
    };

    // eslint-disable-next-line no-void
    void init();
  }, []);

  useEffect(() => {
    getFirstPage().catch(error => {
            console.log("Error getting first page: ", error);
        });
  }, [activeFilter])

  useEffect(() => {
    approveAbsenceRequired()
      .catch(error => console.error("Error fetching user email:", error));
  }, [currentUser, approveAbsenceModalOpen, requestAbsenceModalOpen])

  useEffect(() => {
    if (currentPageNumber === 0 || currentPageNumber > 0 ) {
            const urlToLoad = pageUrls[currentPageNumber];
            if (urlToLoad) {
                loadPageByUrl(urlToLoad).catch(error => {
                    console.log("Error loading page: ", error);
                });
            }
        }
  }, [currentPageNumber]);

  // You only need one useEffect to handle the initialization
  useEffect(() => {
    if (currentUser) {
      // This runs once when the component loads or the user is identified
      createNewYearPTO(props.sp, currentUser.Id).catch(error => {
        console.error("Error creating new year PTO: ", error);
      });
    }
  }, [currentUser]); // Triggered only when the user is loaded


  return (
    <div className={styles.contactFiltering}>
      <div className={styles.headerActionsContainer}>
        <div className={styles.headerActions}>
          <div onClick={handleRequestAbsenceClick}>Žádost o nepřítomnost</div>
          {showApproveAbsence && <div onClick={handleApproveAbsenceClick}>Schválit nepřítomnost</div>}
          <div onClick={handleFinancialStatementsClick}>Měsíční shrnutí</div>
          <div onClick={handleUserPageClick} className={styles.userAction} >
            {currentUser?.Image && <Image src={fetchUserImage()} className={styles.userImage} imageFit={ImageFit.cover} />}
          </div>
        </div>
      </div>
      <TabsView>
        <PivotItem headerText='Contakty' itemKey='contacts'>
          <div className={styles.filtersContainer}>
            <TextField label="Jméno:" placeholder="Zadej jméno nebo příjmení..." value={nameText} onChange={onNameTextChange} />
            <TextField label="Tel. číslo:" placeholder="Zadej tel. číslo..." value={phoneNumberText} onChange={onPhoneNumberTextChange} />
            <TextField label="Email:" placeholder="Zadej email..." value={emailText} onChange={onEmailTextChange} />
            <Dropdown
              label="Oddělení:"
              placeholder="Vyberte oddělení"
              options={departmentOptions}
              selectedKey={departmentKey}
              onChange={onDepartmentChange} />
          </div>
          <div className={styles.actionsContainer}>
            <PrimaryButton text="Aplikovat filtry" onClick={createFilter} style={{ marginRight: '8px' }} />
            <PrimaryButton text="Vymazat filtry" onClick={onClearFilterClick} />
          </div>
          <div className={styles.resultsContainer}>
            {isLoading ? (
              <Spinner label="Načítám kontakty..." />
            ) : (
              <Paginator
                hasNext={hasNext}
                hasPrevious={currentPageNumber > 0}
                currentPageNumber={currentPageNumber}
                handleNext={handleNext}
                handlePrevious={handlePrevious}
              >
                <div className={styles.cardContainer}>
                  {contacts.map((contact: IContact) => (
                    <ContactCard key={contact.Id} sp={props.sp} contact={contact} webAbsoluteUrl={props.webAbsoluteUrl} onClick={() => handleContactCardClick(contact)} />
                  ))}
                </div>
              </Paginator>
            )}
          </div>
        </ PivotItem>
        <PivotItem headerText='Absence' itemKey='absences'>
          <AbsenceList sp={props.sp} requestModalOpen={requestAbsenceModalOpen} approveModalOpen={approveAbsenceModalOpen}/>
        </PivotItem>
        { /*isTagCreator && <PivotItem headerText='Tags' itemKey='tags'>
          <TagHolder sp={props.sp} webUrl={props.webAbsoluteUrl} />
        </PivotItem> */}
      </TabsView>
      <Modal isOpen={userModalOpen} onClose={handleCloseUserPageModal} width='medium'>
        {currentUser && <UserPage sp={props.sp} 
          contact={currentUser} 
          webAbsoluteUrl={props.webAbsoluteUrl} 
          graph={props.graph}
          //isTagCreator={isTagCreator}
          //onUpdate={handleUserPageUpdate}
          onAbsenceUpdate={approveAbsenceRequired}
          />}
      </Modal>
      <Modal isOpen={!!selectedContact} onClose={handleCloseContactModal} width='medium'>
        {selectedContact && <ContactPage sp={props.sp} 
          contact={selectedContact} 
          webAbsoluteUrl={props.webAbsoluteUrl} 
          //isTagCreator={isTagCreator} 
          //onUpdate={handleContactUpdate} 
          />}
      </Modal>
      <Modal isOpen={requestAbsenceModalOpen} onClose={handleRequestAbsenceUpdate}>
        {currentUser && 
          <RequestAbsence user={currentUser} sp={props.sp} graph={props.graph}
            onUpdate={handleRequestAbsenceUpdate}/> 
        }
      </Modal>
      <Modal isOpen={approveAbsenceModalOpen} onClose={handleApproveAbsenceUpdate} width='large'>
        {currentUser && <ApproveAbsence sp={props.sp} user={currentUser} graph={props.graph} onUpdate={handleApproveAbsenceUpdate}/>}
      </ Modal>
      <Modal isOpen={financialStatementsModalOpen} onClose={handleFinancialStatementsUpdate} width='large'>
        <FinancialStatements sp={props.sp} />
      </ Modal>
        
    </div>
  );
};

export default ContactFiltering;