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


  private _applyFilters = (): void => {
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
    void this._fetchContacts(combinedFilter);
  };
  

  private async _fetchContacts(filterQuery?: string): Promise<void> {
    this.setState({ isLoading: true });

    try {
      let itemsQuery = this.props.sp.web.lists.getByTitle('ContactFilteringTest').items.select(
        'Id',
        'Title',
        'FirstName',
        'LastName',
        'Department',
        'Image'
      );

      if (filterQuery && filterQuery.length > 0) {
        itemsQuery = itemsQuery.filter(filterQuery);
      }

      const items: IContact[] = await itemsQuery();

      console.log("Fetched contacts(filter: ", filterQuery, "): ", items);
      this.setState({ contacts: items, isLoading: false });
    } catch (error) {
      console.error('Error fetching contacts:', error);
      this.setState({ isLoading: false });
    }
  }


  private async _fetchDepartmentChoices(): Promise<void> {
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
        console.log("Fetched department options: ", options);
      } else {
        this.setState({ departmentOptions: [], isLoadingDepartments: false });
        console.log("Department field not found or no choices available.");
      }

    } catch (error) {
      this.setState({ isLoadingDepartments: false });
      console.error('Error fetching department choices:', error);
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


  private _onClearFilterClick = (): void => {
    this.setState({ 
    searchText: "", 
    selectedDepartment: "",
  }, () => {
    // Call _fetchContacts in the setState callback to ensure state is updated first
    void this._fetchContacts(); // Fetch all items (no filter string passed)
  });

  }


  public componentDidMount(): void {
    console.log("Component did mount")
    void this._fetchContacts();
    void this._fetchDepartmentChoices();
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
              <p>Fetched {contacts.length} contacts from ContactFilteringTest.</p>
              <div className={styles.cardsGridContainer}>
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