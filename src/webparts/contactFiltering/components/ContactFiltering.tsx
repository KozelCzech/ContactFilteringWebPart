import * as React from 'react';
import styles from './ContactFiltering.module.scss'; // Your SCSS styles
import type { IContactFilteringProps } from './IContactFilteringProps';

import { TextField } from '@fluentui/react/lib/TextField';
import { PrimaryButton } from '@fluentui/react/lib/Button';
import { Dropdown, IDropdownOption } from '@fluentui/react/lib/Dropdown';

import { IContact } from '../models/IContact'
import ContactCard from './ContactCard';
import { Spinner } from '@fluentui/react/lib/Spinner';
import Modal from './Modal';
import ContactPage from './ContactPage';


export interface IContactFilteringState {
  contacts: IContact[];
  isLoading: boolean;
  nameText: string;
  phoneNumberText: string;
  emailText: string;
  departmentOptions: IDropdownOption[];
  selectedDepartment?: string | number;
  isLoadingDepartments: boolean;
  selectedContact?: IContact | undefined;
}

export default class ContactFiltering extends React.Component<IContactFilteringProps, IContactFilteringState> {
  
  constructor(props: IContactFilteringProps) {
    super(props);
    this.state = {
      contacts: [],
      isLoading: true,
      nameText: "",
      phoneNumberText: "",
      emailText: "",
      departmentOptions: [],
      selectedDepartment: undefined,
      isLoadingDepartments: false,
      selectedContact: undefined
    };
  }


  private _applyFilters = async (): Promise<void> => {
    console.log("Applying filters...");
    const { nameText: nameText, phoneNumberText: phoneNumberText, emailText: emailText, selectedDepartment } = this.state;
    const filterParts: string[] = [];

    const escapedNameText = nameText.replace(/'/g, "''");
    if (nameText && nameText.trim() !== "") {
      filterParts.push(
        `(substringof('${escapedNameText}', FirstName) or substringof('${escapedNameText}', LastName) or substringof('${escapedNameText}', Title))`
      );
    }

    if (selectedDepartment && selectedDepartment !== "") {
      filterParts.push(`(Department eq '${selectedDepartment}')`);
    }

    const escapedPhoneNumberText = phoneNumberText.replace(/'/g, "''");
    if (phoneNumberText && phoneNumberText.trim() !== "") {
      filterParts.push(`(substringof('${escapedPhoneNumberText}', PhoneNumber))`);
    }

    const escapedEmailText = emailText.replace(/'/g, "''");
    if (emailText && emailText.trim() !== "") {
      filterParts.push(`(substringof('${escapedEmailText}', Email))`);
    }

    let combinedFilter = "";
    if (filterParts.length > 0) {
      combinedFilter = filterParts.join(' and ');
    }

    console.log("Applying filter: ", combinedFilter);
    const filteredContacts: IContact[] = await this._fetchContacts(combinedFilter);

    this.setState({ contacts: filteredContacts})
  };
  

  private async _fetchContacts(filterQuery?: string): Promise<IContact[]> {
    this.setState({ isLoading: true });

    try {
      let itemsQuery = this.props.sp.web.lists.getByTitle('ContactFilteringTest').items.select(
        'Id',
        'Title',
        'FirstName',
        'LastName',
        'Department',
        'Image',
        'PhoneNumber',
        'Email'
      );

      if (filterQuery && filterQuery.length > 0) {
        itemsQuery = itemsQuery.filter(filterQuery);
      }

      const items: IContact[] = await itemsQuery();

      console.log("Fetched contacts(filter: ", filterQuery, "): ", items);
      this.setState({ isLoading: false });
      return items;
    } catch (error) {
      console.error('Error fetching contacts:', error);
      this.setState({ isLoading: false });
      return [];
    }
  }


  private async _fetchDepartmentChoices(): Promise<IDropdownOption[]> {
    this.setState({ isLoadingDepartments: true });

    try {
      const departmentField = await this.props.sp.web.lists.getByTitle('ContactFilteringTest').fields.getByInternalNameOrTitle('Department')();

      if (departmentField && departmentField.Choices) {
        const options: IDropdownOption[] = [
          { key: "", text: "All Departments"}
        ];

        departmentField.Choices.forEach((choice: string) => {
          options.push({ key: choice, text: choice });
        });
        this.setState({ departmentOptions: options, isLoadingDepartments: false });
        return options;
      } else {
        this.setState({ departmentOptions: [], isLoadingDepartments: false });
        console.log("Department field not found or no choices available.");
        return [];
      }

    } catch (error) {
      this.setState({ isLoadingDepartments: false });
      console.error('Error fetching department choices:', error);
      return [];
    }
  }

//#region UI Handlers
  private _onNameTextChange = (event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string): void => {
    this.setState({ nameText: newValue || "" });
  }

  private _onPhoneNumberTextChange = (event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string): void => {
    this.setState({ phoneNumberText: newValue || "" });
  }

  private _onEmailTextChange = (event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string): void => {
    this.setState({ emailText: newValue || "" });
  }

  private _onDepartmentChange = (event: React.FormEvent<HTMLDivElement>, option?: IDropdownOption, index?: number): void => {
    if (option) {
      this.setState({ selectedDepartment: option.key });
    } else {
      this.setState({ selectedDepartment: "" });
    }
  }


  private _onClearFilterClick = async (): Promise<void> => {
    this.setState({ 
    nameText: "", 
    selectedDepartment: "",
  }, async () => {
    // Call _fetchContacts in the setState callback to ensure state is updated first
    const allContacts: IContact[] = await this._fetchContacts();
    this.setState({ contacts: allContacts}); // Fetch all items (no filter string passed)
  });

  }


  private _handleContactCardClick = (contact: IContact): void => {
    this.setState({ selectedContact: contact });
  }


  private _handleCloseModal = (): void => {
    this.setState({ selectedContact: undefined });
  }

//#endregion
  

  public async componentDidMount(): Promise<void> {
    console.log("Component did mount")
    const allContacts: IContact[] = await this._fetchContacts();
    const allDepartments: IDropdownOption[] = await this._fetchDepartmentChoices();

    this.setState({ contacts: allContacts, departmentOptions: allDepartments });
  }


  public render(): React.ReactElement<IContactFilteringProps> {
    const { isLoading, contacts } = this.state;

    return (
      <div className={styles.contactFiltering}> {/* Ensure class name matches your .module.scss */}
        <div className={styles.filtersContainer}> {/* Filter inputs */}
          <TextField
            label="Name:"
            placeholder="Enter first or last name..."
            value={this.state.nameText}
            onChange={this._onNameTextChange}
          />
          <Dropdown 
            label="Department:"
            placeholder="Select a Department"
            options={this.state.departmentOptions}
            selectedKey={this.state.selectedDepartment}
            onChange={this._onDepartmentChange}
            disabled={this.state.isLoadingDepartments}
          />
            <TextField
              label="Phone number:"
              placeholder="Enter phone number..."
              value={this.state.phoneNumberText}
              onChange={this._onPhoneNumberTextChange}
            />
          <TextField
            label="Email:"
            placeholder="Enter email..."
            value={this.state.emailText}
            onChange={this._onEmailTextChange}
          />
        </div>
        <div className={styles.actionsContainer}> {/* Buttons */}
          <PrimaryButton
            text="Apply Filters"
            onClick={this._applyFilters}
            style={{ marginRight: '8px' }}
          />
          <PrimaryButton
            text="Clear Filters"
            onClick={this._onClearFilterClick}
          />
        </div>

        <div className={styles.resultsContainer}>
          {isLoading ? (
            <Spinner label="I am definitely loading..." />
          ) : (
            <>
              <div className={styles.cardContainer}>
                {contacts.map((contact: IContact) => (
                  <ContactCard key={contact.Id} contact={contact} webAbsoluteUrl={this.props.webAbsoluteUrl} onClick={() => this._handleContactCardClick(contact)}/>
                ))}
              </div>
            </>
          )}
        </div>
        <Modal isOpen={!!this.state.selectedContact} onClose={this._handleCloseModal}> 
          { this.state.selectedContact && (
            <ContactPage contact={this.state.selectedContact} webAbsoluteUrl={this.props.webAbsoluteUrl} />
          )}
        </Modal>
      </div>
    );
  }
}