import * as React from 'react';
import styles from './ContactFiltering.module.scss'; // Your SCSS styles
import type { IContactFilteringProps } from './IContactFilteringProps';

import { TextField } from '@fluentui/react/lib/TextField';
import { PrimaryButton } from '@fluentui/react/lib/Button';
import { Dropdown, IDropdownOption } from '@fluentui/react/lib/Dropdown';

import { IContact } from '../models/IContact'
import ContactCard from './ContactCard';


export interface IContactFilteringState {
  contacts: IContact[];
  isLoading: boolean;
  searchText: string;
  departmentOptions: IDropdownOption[];
  selectedDepartment?: string | number;
  isLoadingDepartments: boolean;
}

export default class ContactFiltering extends React.Component<IContactFilteringProps, IContactFilteringState> {
  
  constructor(props: IContactFilteringProps) {
    super(props);
    this.state = {
      contacts: [],
      isLoading: true,
      searchText: "",
      departmentOptions: [],
      selectedDepartment: undefined,
      isLoadingDepartments: false,
    };
  }


  private _applyFilters = async (): Promise<void> => {
    console.log("Applying filters...");
    const { searchText, selectedDepartment } = this.state;
    const filterParts: string[] = [];

    const escapedSearchText = searchText.replace(/'/g, "''");
    if (searchText && searchText.trim() !== "") {
      filterParts.push(
        `(substringof('${escapedSearchText}', FirstName) or substringof('${escapedSearchText}', LastName) or substringof('${escapedSearchText}', Title))`
      );
    }

    if (selectedDepartment && selectedDepartment !== "") {
      filterParts.push(`(Department eq '${selectedDepartment}')`);
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


  private _onSearchTextChange = (event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string): void => {
    this.setState({ searchText: newValue || "" });
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
    searchText: "", 
    selectedDepartment: "",
  }, async () => {
    // Call _fetchContacts in the setState callback to ensure state is updated first
    const allContacts: IContact[] = await this._fetchContacts();
    this.setState({ contacts: allContacts}); // Fetch all items (no filter string passed)
  });

  }


  public async componentDidMount(): Promise<void> {
    console.log("Component did mount")
    const allContacts: IContact[] = await this._fetchContacts();
    const allDepartments: IDropdownOption[] = await this._fetchDepartmentChoices();

    this.setState({ contacts: allContacts, departmentOptions: allDepartments });
  }


  public render(): React.ReactElement<IContactFilteringProps> {
    const { isLoading, contacts } = this.state;

    return (
      <section className={styles.contactFiltering}> {/* Ensure class name matches your .module.scss */}
        <div className={styles.filtersContainer}>
          <TextField
            label="Search Contacts"
            placeholder="Enter name, email, or department..."
            value={this.state.searchText}
            onChange={this._onSearchTextChange}
          />
          <Dropdown 
            label="Filter by Department"
            placeholder="Select a Department"
            options={this.state.departmentOptions}
            selectedKey={this.state.selectedDepartment}
            onChange={this._onDepartmentChange}
            disabled={this.state.isLoadingDepartments}
            className={styles.filterControl} //optional for styling
          />
        </div>
        <div className={styles.actionsContainer}>
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
            <p>Loading contacts...</p>
          ) : (
            <>
              <div className={styles.cardContainer}>
                {contacts.map((contact: IContact) => (
                  <ContactCard key={contact.Id} contact={contact} webAbsoluteUrl={this.props.webAbsoluteUrl}/>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    );
  }
}