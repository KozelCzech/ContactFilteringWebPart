import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import styles from './ContactFiltering.module.scss';
import type { IContactFilteringProps } from './IContactFilteringProps';
import { TextField } from '@fluentui/react/lib/TextField';
import { PrimaryButton } from '@fluentui/react/lib/Button';
import { Dropdown, IDropdownOption } from '@fluentui/react/lib/Dropdown';
import { Spinner } from '@fluentui/react/lib/Spinner';
import { IContact } from '../models/IContact';
import ContactCard from './ContactCard';
import ContactPage from './contactPage/ContactPage';
import TagHolder from './tagFolder/TagHolder';
import Modal from './subComponents/modal/Modal';
import Collapsible from './subComponents/collapsible/Collapsible';
import Paginator from './subComponents/paginator/Paginator';

const ContactFiltering: React.FC<IContactFilteringProps> = (props) => {
  const [contacts, setContacts] = useState<IContact[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  const [nameText, setNameText] = useState<string>("");
  const [phoneNumberText, setPhoneNumberText] = useState<string>("");
  const [emailText, setEmailText] = useState<string>("");
  const [departmentOptions, setDepartmentOptions] = useState<IDropdownOption[]>([]);

  const [activeFilter, setActiveFilter] = useState<string>("");
  
  const [selectedDepartment, setSelectedDepartment] = useState<string | number | undefined>(undefined);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState<boolean>(false);
  
  const [selectedContact, setSelectedContact] = useState<IContact | undefined>(undefined);
  const [isTagCreator, setIsTagCreator] = useState<boolean>(false);

  const [pageUrls, setPageUrls] = useState<string[]>([]);
  const [currentPageNumber, setCurrentPageNumber] = useState<number>(0);
  const [hasNext, setHasNext] = useState<boolean>(false);
  const [itemsPerPage, setItemsPerPage] = useState<number>(4);


  const createFilter = async(): Promise<void> => {
    const filterParts: string[] = [];
    const escapedNameText = nameText.replace(/'/g, "''");
    if (nameText.trim() !== "") {
      filterParts.push(`(substringof('${escapedNameText}', FirstName) or substringof('${escapedNameText}', LastName) or substringof('${escapedNameText}', Title))`);
    }
    if (selectedDepartment && selectedDepartment !== "") {
      filterParts.push(`(Department eq '${selectedDepartment}')`);
    }
    const escapedPhoneNumberText = phoneNumberText.replace(/'/g, "''");
    if (phoneNumberText.trim() !== "") {
      filterParts.push(`(substringof('${escapedPhoneNumberText}', PhoneNumber))`);
    }
    const escapedEmailText = emailText.replace(/'/g, "''");
    if (emailText.trim() !== "") {
      filterParts.push(`(substringof('${escapedEmailText}', Email))`);
    }
    const combinedFilter = filterParts.join(' and ');
    setActiveFilter(combinedFilter)
  }


  const createFullQuery = async(): Promise<string> => {
      let itemsQuery = props.sp.web.lists.getByTitle('ContactFilteringTest').items.select(
        'Id', 'Title', 'FirstName', 'LastName', 'Department', 'Image', 'PhoneNumber', 'Email'
      );
      const filterQuery = activeFilter;

      if (filterQuery) {
        itemsQuery = itemsQuery.filter(filterQuery);
      }

      return itemsQuery.top(itemsPerPage).toRequestUrl();

  }


  const loadPageByUrl = useCallback(async (url: string) => {
    setIsLoading(true);
    try {
        const response = await fetch(url, {
            headers: { Accept: "application/json;odata=verbose" }
        });

        if (response.ok) {
            const data = await response.json();
            const newItems = data.d.results as IContact[];
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
        console.log("Error loading page: ", error);
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

  


  const fetchDepartmentChoices = useCallback(async (): Promise<void> => {
    setIsLoadingDepartments(true);
    try {
      const departmentField = await props.sp.web.lists.getByTitle('ContactFilteringTest').fields.getByInternalNameOrTitle('Department')();
      if (departmentField && departmentField.Choices) {
        const options: IDropdownOption[] = [{ key: "", text: "All Departments" }, ...departmentField.Choices.map((choice: string) => ({ key: choice, text: choice }))];
        setDepartmentOptions(options);
      } else {
        console.log("Department field not found or no choices available.");
        setDepartmentOptions([]);
      }
    } catch (error) {
      console.error('Error fetching department choices:', error);
    } finally {
      setIsLoadingDepartments(false);
    }
  }, [props.sp]);


  const isUserInGroup = useCallback(async (groupName: string): Promise<boolean> => {
    try {
      const response = await props.sp.web.currentUser.groups.filter(`LoginName eq '${groupName}'`)();
      return response.length > 0;
    } catch (error) {
      console.error('Error checking group membership:', error);
      return false;
    }
  }, [props.sp]);


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
    setSelectedDepartment(option ? option.key : "");
  };


  const onClearFilterClick = useCallback(async (): Promise<void> => {
    setNameText("");
    setPhoneNumberText("");
    setEmailText("");
    setSelectedDepartment("");

    setActiveFilter("");

    await getFirstPage();
  }, [getFirstPage]);


  const handleContactCardClick = (contact: IContact): void => {
    setSelectedContact(contact);
  };


  const handleCloseModal = (): void => {
    setSelectedContact(undefined);
  };


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

  
  useEffect(() => {
    const init = async (): Promise<void> => {
      console.log("Component did mount");
      await getFirstPage();
      await fetchDepartmentChoices();
      const tagCreatorStatus = await isUserInGroup("TagCreators");
      setIsTagCreator(tagCreatorStatus);
      setItemsPerPage(4);
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
      <div className={styles.filtersContainer}>
        <TextField label="Name:" placeholder="Enter first or last name..." value={nameText} onChange={onNameTextChange} />
        <Dropdown
          label="Department:"
          placeholder="Select a Department"
          options={departmentOptions}
          selectedKey={selectedDepartment}
          onChange={onDepartmentChange}
          disabled={isLoadingDepartments}
        />
        <TextField label="Phone number:" placeholder="Enter phone number..." value={phoneNumberText} onChange={onPhoneNumberTextChange} />
        <TextField label="Email:" placeholder="Enter email..." value={emailText} onChange={onEmailTextChange} />
      </div>
      <div className={styles.actionsContainer}>
        <PrimaryButton text="Apply Filters" onClick={createFilter} style={{ marginRight: '8px' }} />
        <PrimaryButton text="Clear Filters" onClick={onClearFilterClick} />
      </div>
      <div className={styles.resultsContainer}>
        {isLoading ? (
          <Spinner label="I am definitely loading..." />
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
                <ContactCard key={contact.Id} contact={contact} webAbsoluteUrl={props.webAbsoluteUrl} onClick={() => handleContactCardClick(contact)} />
              ))}
            </div>
          </Paginator>
        )}
      </div>
      <Modal isOpen={!!selectedContact} onClose={handleCloseModal}>
        {selectedContact && <ContactPage contact={selectedContact} webAbsoluteUrl={props.webAbsoluteUrl} />}
      </Modal>
      {isTagCreator && (
        <Collapsible title="Tags">
          <TagHolder sp={props.sp} webUrl={props.webAbsoluteUrl} />
        </Collapsible>
      )}
    </div>
  );
};

export default ContactFiltering;
