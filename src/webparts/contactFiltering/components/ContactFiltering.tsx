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
  Spinner
} from '@fluentui/react';
import { IContact } from '../models/IContact';
import ContactCard from './ContactCard';
import Modal from './subComponents/modal/Modal';
import Paginator from './subComponents/paginator/Paginator';
import ContactPage from './contactPage/ContactPage';
import { fetchAllDepartments, fetchEmployeeIdsByDepartment } from '../../../services/userServices';
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

  const [pageUrls, setPageUrls] = useState<string[]>([]);
  const [currentPageNumber, setCurrentPageNumber] = useState<number>(0);
  const [hasNext, setHasNext] = useState<boolean>(false);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  const [ userModalOpen, setUserModalOpen ] = useState<boolean>(false);
  const [ currentUser, setCurrentUser] = useState<IContact>();

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




    const fetchUserImage = (): string => {
      try {
        if (currentUser?.Image) {
          const attachmentName = JSON.parse(currentUser.Image).fileName;
          return `${props.webAbsoluteUrl}/Lists/${listName}/Attachments/${currentUser.Id}/${attachmentName}`;
        }
      } catch (exception) {
        console.error("Error parsing user image JSON: ", exception);
      }
      return "";
    }


  // #endregion
  
  useEffect(() => {
    const init = async (): Promise<void> => {
      console.log("Component did mount");
      await getFirstPage();
      setItemsPerPage(10);

      fetchUser().catch(error => console.error("Error fetching user email:", error));

      fetchAllDepartments(props.sp).then(departments => {
        const options: IDropdownOption[] = departments.map(dep => ({ key: dep.UniqueCode, text: `${dep.UniqueCode} - ${dep.Title}`}));
        options.unshift({ key: "", text: "Všechna oddělení" });
        setDepartmentOptions(options);
      }).catch(error => console.error("Error fetching departments:", error));
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
    if (currentPageNumber === 0 || currentPageNumber > 0 ) {
            const urlToLoad = pageUrls[currentPageNumber];
            if (urlToLoad) {
                loadPageByUrl(urlToLoad).catch(error => {
                    console.log("Error loading page: ", error);
                });
            }
        }
  }, [currentPageNumber]);


  return (
    <div className={styles.contactFiltering}>
      <div className={styles.headerActionsContainer}>
        <div className={styles.headerActions}>
          <div onClick={handleUserPageClick} className={styles.userAction} >
            {currentUser?.Image && <Image src={fetchUserImage()} className={styles.userImage} imageFit={ImageFit.cover} />}
          </div>
        </div>
      </div>
      
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

      <Modal isOpen={userModalOpen} onClose={handleCloseUserPageModal} width='medium'>
        {currentUser && <ContactPage sp={props.sp} 
          contact={currentUser} 
          webAbsoluteUrl={props.webAbsoluteUrl} 
          />}
      </Modal>
      <Modal isOpen={!!selectedContact} onClose={handleCloseContactModal} width='medium'>
        {selectedContact && <ContactPage sp={props.sp} 
          contact={selectedContact} 
          webAbsoluteUrl={props.webAbsoluteUrl} 
          />}
      </Modal>
    </div>
  );
};

export default ContactFiltering;