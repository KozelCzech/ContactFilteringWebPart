import * as React from 'react';
import { useState, useEffect } from 'react';
import styles from './ContactFiltering.module.scss';
import type { IContactFilteringProps } from './IContactFilteringProps';
import {
  TextField,
  Spinner
} from '@fluentui/react';
import { IContact } from '../models/IContact';
import { getContactItemsUrl } from '../../../services/contactServices';
import { SP_LISTS } from '../../../services/spConstants';
import { GraphFI } from '@pnp/graph';
import "@pnp/graph/users";
import "@pnp/graph/photos";

interface IDepartment {
  code: string;
  label: string;
  svgPath: string;
}

const DEPARTMENTS: IDepartment[] = [
  {
    code: 'ČMH',
    label: 'ČMH – České muzeum hudby',
    svgPath: 'M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h6v5.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V3h-6z'
  },
  {
    code: 'HM',
    label: 'HM – Historické muzeum',
    svgPath: 'M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v3c0 2.44 1.72 4.48 4 4.9V19H4v2h16v-2h-3v-4.1c2.28-.42 4-2.46 4-4.9V7c0-1.1-.9-2-2-2zM5 9V7h2v5.18c-1.16-.41-2-1.47-2-3.18zm14 0c0 1.71-.84 2.77-2 3.18V7h2v2z'
  },
  {
    code: 'NPM',
    label: 'NPM – Náprstkovo muzeum',
    svgPath: 'M12 2a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zm3.5 6h-7C7.67 8 7 8.67 7 9.5V15h2v5h6v-5h2V9.5c0-.83-.67-1.5-1.5-1.5zM16 22H8v-1h8v1z'
  },
  {
    code: 'KNM',
    label: 'KNM – Knihovna Národního muzea',
    svgPath: 'M19 4H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-9 14H7V6h3v12zm5 0h-3V6h3v12zm4 0h-2V6h2v12z'
  },
  {
    code: 'PM',
    label: 'PM – Přírodovědecké muzeum',
    svgPath: 'M19 8h-2.17c-.26-.74-.68-1.41-1.22-1.98L17 4.63l-1.41-1.41-2.12 2.12C12.94 5.12 12.48 5 12 5s-.94.12-1.47.34L8.41 3.22 7 4.63l1.39 1.39C7.85 6.59 7.43 7.26 7.17 8H5v2h2.08c-.05.33-.08.66-.08 1V12H5v2h2v1c0 .34.03.67.08 1H5v2h2.17c.55 1.54 1.93 2.68 3.63 2.94L9.05 21.05l1.41 1.41 2.12-2.12c.94.22 1.94.22 2.88 0l2.12 2.12 1.41-1.41-1.75-1.75c1.7-.26 3.08-1.4 3.63-2.94H19v-2h-2.08c.05-.33.08-.66.08-1v-1h2v-2h-2v-1c0-.34-.03-.67-.08-1H19V8zm-4 4H9v-1h6v1zm0-3H9V8h6v1z'
  },
  {
    code: 'KGŘ',
    label: 'KGŘ – Odbor Kancelář generálního ředitele',
    svgPath: 'M16.5 13c-1.2 0-3.07.34-3.74 1-1.3-.84-3.32-1-4.76-1C5.6 13 2 14.8 2 17v3h18v-3c0-2.2-3.6-4-5.5-4zM8 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm8.5 0c1.38 0 2.5-1.12 2.5-2.5S17.88 6 16.5 6c-1.38 0-2.5 1.12-2.5 2.5s1.12 2.5 2.5 2.5z'
  },
  {
    code: 'OEN',
    label: 'OEN – Odbor ekonomického náměstka',
    svgPath: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z'
  },
  {
    code: 'OPN',
    label: 'OPN – Odbor provozního náměstka',
    svgPath: 'M12 2L2 7v2h20V7L12 2zm-8 9v8h3v-8H4zm6 0v8h4v-8h-4zm7 0v8h3v-8h-3zm-13 10h18v1H4v-1z'
  },
  {
    code: 'SVN',
    label: 'SVN – Odbor náměstka pro centrální sbírkotvornou a výstavn...',
    svgPath: 'M12 2a5 5 0 0 0-5 5c0 1.76.92 3.31 2.31 4.19L8.1 19.3l3.9-2.1 3.9 2.1-1.21-8.11A5.002 5.002 0 0 0 17 7a5 5 0 0 0-5-5zm0 8a3 3 0 1 1 0-6 3 3 0 0 1 0 6z'
  },
  {
    code: 'NIR',
    label: 'NIR – Obor náměstka pro investiční rozvoj',
    svgPath: 'M19 11h-2V3H7v4H3v14h18V11h-2zm-8 8H5v-2h4v2zm0-4H5v-2h4v2zm0-4H5V9h4v2zm6 8h-4v-2h4v2zm0-4h-4v-2h4v2zm0-4h-4v-2h4v2zm0-4h-4V5h4v2zm4 12h-2v-2h2v2zm0-4h-2v-2h2v2z'
  },
  {
    code: 'ODIS',
    label: 'ODIS – Odbor digitalizace a informačních systémů',
    svgPath: 'M20 18c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z'
  }
];

// Global in-memory cache for Graph profile photos
const photoCache: Record<string, string> = {};

interface IContactPhotoProps {
  email: string | undefined;
  upn: string | undefined;
  fallbackImageUrl: string;
  fullName: string;
  graph: GraphFI;
}

const ContactPhoto: React.FC<IContactPhotoProps> = ({ email, upn, fallbackImageUrl, fullName, graph }) => {
  const userKey = (upn || email || "").trim();
  const initialUrl = userKey && photoCache[userKey] !== undefined
    ? (photoCache[userKey] || fallbackImageUrl || "")
    : (fallbackImageUrl || "");

  const [photoUrl, setPhotoUrl] = useState<string>(initialUrl);

  useEffect(() => {
    const key = (upn || email || "").trim();
    if (!key) {
      setPhotoUrl(fallbackImageUrl || "");
      return;
    }

    if (photoCache[key] !== undefined) {
      setPhotoUrl(photoCache[key] || fallbackImageUrl || "");
      return;
    }

    let isMounted = true;

    const fetchPhoto = async (): Promise<void> => {
      try {
        const response = await graph.users.getById(key).photo.getBlob();
        if (response && isMounted) {
          const url = URL.createObjectURL(response);
          photoCache[key] = url;
          setPhotoUrl(url);
        } else if (isMounted) {
          photoCache[key] = "";
          setPhotoUrl(fallbackImageUrl || "");
        }
      } catch {
        if (isMounted) {
          photoCache[key] = "";
          setPhotoUrl(fallbackImageUrl || "");
        }
      }
    };

    fetchPhoto().catch(console.error);

    return () => {
      isMounted = false;
    };
  }, [email, upn, fallbackImageUrl, graph]);

  if (photoUrl) {
    return <img src={photoUrl} alt={fullName} className={styles.contactPhoto} />;
  }

  return (
    <div className={styles.silhouettePlaceholder}>
      <svg viewBox="0 0 24 24" width="36" height="36" fill="currentColor">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
      </svg>
    </div>
  );
};

const ContactFiltering: React.FC<IContactFilteringProps> = (props) => {
  const [contacts, setContacts] = useState<IContact[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchText, setSearchText] = useState<string>("");
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [selectedSubDepartment, setSelectedSubDepartment] = useState<string | null>(null);
  const [availableDepartments, setAvailableDepartments] = useState<string[]>([]);
  const [subDeptMapping, setSubDeptMapping] = useState<Record<string, string>>({});
  const [globalSearchSuggestions, setGlobalSearchSuggestions] = useState<Array<{
    name: string;
    department: string;
    contact: IContact;
  }>>([]);
  const [totalSuggestionsCount, setTotalSuggestionsCount] = useState<number>(0);

  const listName: string = SP_LISTS.ContactFilteringTest;

  useEffect(() => {
    const fetchSubDepartmentsAndMapping = async (): Promise<void> => {
      try {
        const items = await props.sp.web.lists.getByTitle('SubDepartment').items
          .select('Title', 'DeptText')
          .top(5000)();
        
        const mapping: Record<string, string> = {};
        const depts: string[] = [];
        
        items.forEach(item => {
          if (item.DeptText) {
            const code = item.DeptText.trim();
            if (code !== "") {
              depts.push(code);
              if (item.Title) {
                mapping[code] = item.Title.trim();
              }
            }
          }
        });
        
        const unique = Array.from(new Set(depts)).sort((a, b) => a.localeCompare(b, 'cs'));
        setAvailableDepartments(unique);
        setSubDeptMapping(mapping);
      } catch (err) {
        console.error("Failed to load sub-department data: ", err);
      }
    };

    fetchSubDepartmentsAndMapping().catch(err => console.error(err));
  }, [props.sp]);

  const createSearchFilter = (query: string): string => {
    const terms = query.trim().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return "";

    const termFilters = terms.map(term => {
      const escaped = term.replace(/'/g, "''");
      return `(` +
        `substringof('${escaped}', displayName) or ` +
        `substringof('${escaped}', givenName) or ` +
        `substringof('${escaped}', sn) or ` +
        `substringof('${escaped}', name) or ` +
        `substringof('${escaped}', upn) or ` +
        `substringof('${escaped}', mail) or ` +
        `substringof('${escaped}', telephoneNumber) or ` +
        `substringof('${escaped}', mobile) or ` +
        `substringof('${escaped}', homePhone) or ` +
        `substringof('${escaped}', otherHomePhone) or ` +
        `substringof('${escaped}', pager) or ` +
        `substringof('${escaped}', department) or ` +
        `substringof('${escaped}', roomNumber) or ` +
        `substringof('${escaped}', physicalDeliveryOfficeName)` +
      `)`;
    });

    return termFilters.join(' and ');
  };

  const createCombinedFilter = (deptCode: string | null, query: string): string => {
    const filters: string[] = [];

    if (deptCode) {
      if (deptCode === 'KGŘ') {
        filters.push(`(substringof('KGŘ', department) or substringof('GŘ', department) or substringof('ŘNM', department) or substringof('ŘMN', department) or substringof('Pastrňák', sn) or substringof('Pastrnak', sn) or substringof('Pastrňák', displayName) or substringof('Pastrnak', displayName))`);
      } else {
        filters.push(`substringof('${deptCode}', department)`);
      }
    }

    if (query.trim() !== "") {
      const searchFilter = createSearchFilter(query);
      if (searchFilter) {
        filters.push(searchFilter);
      }
    }

    if (filters.length === 0) return "";
    if (filters.length === 1) return filters[0];
    return `(${filters[0]}) and (${filters[1]})`;
  };

  const fetchAllMatchingContacts = async (filter: string): Promise<void> => {
    setIsLoading(true);
    try {
      const topLimit = 5000;
      const initialUrl = getContactItemsUrl(props.sp, [], filter, topLimit, []);
      const cleanedUrl = `${props.webAbsoluteUrl}/${initialUrl}`;

      const response = await fetch(cleanedUrl, {
        headers: { Accept: "application/json;odata=verbose" }
      });

      if (response.ok) {
        const data = await response.json();
        const newItems: IContact[] = (data.d.results as IContact[]).map(contact => contact);
        // Sort contacts alphabetically by name (A to Z) using Czech locale sorting rules
        newItems.sort((a, b) => {
          const nameA = a.displayName || a.name || `${a.givenName || ""} ${a.sn || ""}`.trim() || "No Name";
          const nameB = b.displayName || b.name || `${b.givenName || ""} ${b.sn || ""}`.trim() || "No Name";
          return nameA.localeCompare(nameB, 'cs');
        });
        setContacts(newItems);
      } else {
        const errorText = await response.text();
        console.error("SharePoint REST API Error details: ", errorText);
        throw new Error(`Error fetching data: ${response.statusText} - ${errorText}`);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
      setContacts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const onSearchTextChange = (event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string): void => {
    setSearchText(newValue || "");
  };

  useEffect(() => {
    const trimmed = searchText.trim();
    if (trimmed === "" && !selectedDepartment) {
      setContacts([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const handler = setTimeout(() => {
      const filter = createCombinedFilter(selectedDepartment, trimmed);
      fetchAllMatchingContacts(filter).catch(err => {
        console.error("Search failed:", err);
      });
    }, 350);

    return () => {
      clearTimeout(handler);
    };
  }, [searchText, selectedDepartment]);

  const isPastrnak = (c: IContact): boolean => {
    const name = ((c.displayName || "") + " " + (c.displayNamePrintable || "") + " " + (c.sn || "") + " " + (c.name || "")).toLowerCase();
    return name.indexOf("pastrňák") > -1 || name.indexOf("pastrnak") > -1;
  };

  const fetchGlobalSearchSuggestions = async (query: string): Promise<void> => {
    try {
      const searchFilter = createSearchFilter(query);
      if (!searchFilter) {
        setGlobalSearchSuggestions([]);
        setTotalSuggestionsCount(0);
        return;
      }
      
      const topLimit = 100;
      const initialUrl = getContactItemsUrl(props.sp, [], searchFilter, topLimit, []);
      const cleanedUrl = `${props.webAbsoluteUrl}/${initialUrl}`;

      const response = await fetch(cleanedUrl, {
        headers: { Accept: "application/json;odata=verbose" }
      });

      if (response.ok) {
        const data = await response.json();
        const results = data.d.results as IContact[];
        setTotalSuggestionsCount(results.length);
        if (results.length > 0) {
          const suggestions = results.map(firstMatch => {
            const matchName = firstMatch.displayNamePrintable || firstMatch.displayName || firstMatch.name || `${firstMatch.givenName || ""} ${firstMatch.sn || ""}`.trim();
            return {
              name: matchName,
              department: firstMatch.department || "",
              contact: firstMatch
            };
          });
          setGlobalSearchSuggestions(suggestions);
        } else {
          setGlobalSearchSuggestions([]);
        }
      } else {
        setGlobalSearchSuggestions([]);
        setTotalSuggestionsCount(0);
      }
    } catch (e) {
      console.error("Failed to fetch global search suggestions: ", e);
      setGlobalSearchSuggestions([]);
      setTotalSuggestionsCount(0);
    }
  };

  useEffect(() => {
    const trimmed = searchText.trim();
    if (!isLoading && contacts.length === 0 && selectedDepartment && trimmed !== "") {
      fetchGlobalSearchSuggestions(trimmed).catch(err => {
        console.error(err);
      });
    } else {
      setGlobalSearchSuggestions([]);
      setTotalSuggestionsCount(0);
    }
  }, [contacts, isLoading, searchText, selectedDepartment]);

  const handleShowSuggestion = (contact: IContact): void => {
    const deptValue = contact.department;
    if (deptValue) {
      const baseDept = DEPARTMENTS.find(d => deptValue.includes(d.code));
      if (baseDept) {
        setSelectedDepartment(baseDept.code);
        setSelectedSubDepartment(deptValue);
      } else {
        setSelectedDepartment(null);
        setSelectedSubDepartment(deptValue);
      }
    } else {
      setSelectedDepartment(null);
      setSelectedSubDepartment(null);
    }
    setGlobalSearchSuggestions([]);
    setTotalSuggestionsCount(0);
  };

  const handleClearFilters = (): void => {
    setSearchText("");
    setSelectedDepartment(null);
    setSelectedSubDepartment(null);
    setGlobalSearchSuggestions([]);
    setTotalSuggestionsCount(0);
  };

  const handleGlobalSearchOnly = (): void => {
    setSelectedDepartment(null);
    setSelectedSubDepartment(null);
    setGlobalSearchSuggestions([]);
    setTotalSuggestionsCount(0);
  };

  const getContactImageUrl = (contact: IContact): string => {
    try {
      if (contact.Image) {
        const trimmed = contact.Image.trim();
        if (trimmed.startsWith("{")) {
          const parsed = JSON.parse(trimmed);
          if (parsed.serverRelativeUrl) {
            return parsed.serverRelativeUrl;
          }
          if (parsed.fileName) {
            return `${props.webAbsoluteUrl}/Lists/${listName}/Attachments/${contact.Id}/${parsed.fileName}`;
          }
        }
        return trimmed;
      }
    } catch (e) {
      console.error("Error parsing contact image: ", e);
    }
    return "";
  };

  const getSubDepartmentsFor = (baseCode: string): string[] => {
    return availableDepartments.filter(sub => {
      if (baseCode === 'KGŘ') {
        if (sub.startsWith('GŘ') || sub.startsWith('ŘNM') || sub.startsWith('ŘMN')) {
          return true;
        }
      }
      if (!sub.startsWith(baseCode)) return false;
      if (sub.length === baseCode.length) return true;
      const nextChar = sub.charAt(baseCode.length);
      return nextChar === ' ' || nextChar === '-' || (nextChar >= '0' && nextChar <= '9');
    });
  };

  const formatSubDeptButtonLabel = (subDept: string): string => {
    const title = subDeptMapping[subDept];
    if (title) {
      return `${subDept} – ${title}`;
    }
    const baseDept = DEPARTMENTS.find(d => subDept.includes(d.code));
    if (baseDept) {
      const baseName = baseDept.label.replace(`${baseDept.code} –`, '').replace(`${baseDept.code} -`, '').trim();
      const subDeptLower = subDept.toLowerCase();
      const baseNameLower = baseName.toLowerCase();
      const index = subDeptLower.indexOf(baseNameLower);
      if (index !== -1) {
        const before = subDept.substring(0, index).trim();
        const after = subDept.substring(index + baseName.length).trim();
        
        const cleanBefore = before.endsWith('-') ? before.slice(0, -1).trim() : before;
        const cleanAfter = after.startsWith('-') ? after.slice(1).trim() : after;
        
        const shortened = `${cleanBefore} - ${cleanAfter}`;
        const parts = shortened.split('-');
        if (parts.length > 1) {
          const numberPart = parts[0].trim();
          const suffixPart = parts[1].trim();
          const capitalizedSuffix = suffixPart.charAt(0).toUpperCase() + suffixPart.slice(1);
          return `${numberPart} - ${capitalizedSuffix}`;
        }
        return shortened;
      }
    }
    return subDept;
  };

  const activeSubDepts = selectedDepartment ? getSubDepartmentsFor(selectedDepartment) : [];

  const displayedContacts = selectedSubDepartment
    ? contacts.filter(c => c.department === selectedSubDepartment)
    : contacts;

  const handleDeptClick = (deptValue: string | undefined): void => {
    if (!deptValue) return;

    if (deptValue.startsWith('GŘ') || deptValue.startsWith('ŘNM') || deptValue.startsWith('ŘMN')) {
      setSelectedDepartment('KGŘ');
      setSelectedSubDepartment(deptValue);
      return;
    }

    const baseDept = DEPARTMENTS.find(d => deptValue.includes(d.code));
    if (baseDept) {
      setSelectedDepartment(baseDept.code);
      setSelectedSubDepartment(deptValue);
    } else {
      setSelectedDepartment(null);
      setSelectedSubDepartment(deptValue);
    }
  };

  const renderContactRow = (contact: IContact): React.ReactElement => {
    const imageUrl = getContactImageUrl(contact);
    const fallbackName = contact.displayName || contact.name || `${contact.givenName || ""} ${contact.sn || ""}`.trim() || "No Name";
    const displayName = contact.displayNamePrintable || fallbackName;
    
    const phoneNumbers: string[] = [];
    if (contact.telephoneNumber) phoneNumbers.push(contact.telephoneNumber.trim());
    if (contact.mobile) phoneNumbers.push(contact.mobile.trim());

    return (
      <tr key={contact.Id}>
        <td className={styles.cellPhoto}>
          <div className={styles.photoContainer}>
            <ContactPhoto
              email={contact.mail}
              upn={contact.upn}
              fallbackImageUrl={imageUrl}
              fullName={displayName}
              graph={props.graph}
            />
          </div>
        </td>
        <td className={styles.cellFunction}>
          {contact.company || ""}
        </td>
        <td className={styles.cellName}>
          <div className={styles.nameBlock}>
            <span className={styles.fullNameText}>{displayName}</span>
          </div>
        </td>
        <td className={styles.cellEmail}>
          {contact.mail && (
            <a href={`mailto:${contact.mail}`} className={styles.emailLink}>
              {contact.mail}
            </a>
          )}
        </td>
        <td className={styles.cellMobile}>
          {phoneNumbers.map((num, idx) => (
            <div key={idx} className={styles.phoneBlock}>
              <a href={`tel:${num.replace(/\s+/g, "")}`} className={styles.phoneLink}>
                {num}
              </a>
            </div>
          ))}
        </td>
        <td className={styles.cellDept}>
          {contact.department && (
            <button
              type="button"
              className={styles.deptFilterButton}
              onClick={() => handleDeptClick(contact.department)}
            >
              {contact.department}
            </button>
          )}
        </td>
        <td className={styles.cellOffice}>
          <div className={styles.officeBlock}>
            {contact.roomNumber && (
              <span className={styles.roomText}>{contact.roomNumber}</span>
            )}
            {contact.roomNumber && contact.physicalDeliveryOfficeName && (
              <span className={styles.separatorText}> – </span>
            )}
            {contact.physicalDeliveryOfficeName && (
              <span className={styles.buildingText}>
                {contact.physicalDeliveryOfficeName}
              </span>
            )}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className={styles.contactFiltering}>
      <div className={styles.departmentsGrid}>
        {DEPARTMENTS.map((dept) => {
          const isSelected = selectedDepartment === dept.code;
          return (
            <button
              key={dept.code}
              type="button"
              className={`${styles.departmentButton} ${isSelected ? styles.selected : ''}`}
              onClick={() => {
                setSelectedDepartment(prev => {
                  const next = prev === dept.code ? null : dept.code;
                  setSelectedSubDepartment(null);
                  return next;
                });
              }}
            >
              <span className={styles.iconContainer}>
                <svg className={styles.deptIcon} viewBox="0 0 24 24">
                  <path d={dept.svgPath} />
                </svg>
              </span>
              <span className={styles.deptLabel}>{dept.label}</span>
            </button>
          );
        })}
      </div>

      <div className={styles.headerContainer}>
        <h1 className={styles.title}>Telefonní seznam – Vyhledávání</h1>
        <div className={styles.searchContainer}>
          <TextField
            placeholder="Vyhledat dle příjmení, linky, zkratky oddělení nebo místnosti..."
            value={searchText}
            onChange={onSearchTextChange}
            iconProps={{ iconName: 'Search' }}
            className={styles.searchField}
          />
          {(searchText !== "" || selectedDepartment !== null || selectedSubDepartment !== null) && (
            <button
              type="button"
              className={styles.clearFiltersButton}
              onClick={handleClearFilters}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
              Vymazat filtry
            </button>
          )}
        </div>
      </div>

      {selectedDepartment && activeSubDepts.length > 0 && (
        <div className={styles.subDeptsSection}>
          <h2 className={styles.subDeptsTitle}>Oddělení</h2>
          <div className={styles.subDeptsGrid}>
            {activeSubDepts.map((subDept) => {
              const isSubSelected = selectedSubDepartment === subDept;
              const label = formatSubDeptButtonLabel(subDept);
              return (
                <button
                  key={subDept}
                  type="button"
                  className={`${styles.subDeptLinkButton} ${isSubSelected ? styles.selected : ''}`}
                  onClick={() => {
                    setSelectedSubDepartment(prev => prev === subDept ? null : subDept);
                  }}
                >
                  <span className={styles.subDeptIconContainer}>
                    <svg className={styles.subDeptIcon} viewBox="0 0 24 24" width="18" height="18">
                      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                    </svg>
                  </span>
                  <span className={styles.subDeptLabel}>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className={styles.resultsContainer}>
        {isLoading && <Spinner label="Vyhledávám..." className={styles.spinner} />}
        
        {!isLoading && (searchText.trim() !== "" || selectedDepartment !== null) && displayedContacts.length === 0 && (
          <div className={styles.noResults}>
            Nebyly nalezeny žádné kontakty.
            {globalSearchSuggestions.length > 0 && (
              <div className={styles.suggestionBox}>
                <p className={styles.suggestionTitle}>
                  V oddělení <strong>{DEPARTMENTS.find(d => d.code === selectedDepartment)?.label.split('–')[0].trim() || selectedDepartment}</strong> jsme „{searchText}“ nenašli.
                </p>
                <p className={styles.suggestionSubtitle}>
                  Nalezli jsme ale tyto shody v jiných odděleních:
                </p>
                <ul className={styles.suggestionList}>
                  {globalSearchSuggestions.slice(0, 5).map((suggestion, idx) => {
                    const deptLabel = subDeptMapping[suggestion.department] || suggestion.department;
                    const displayDept = deptLabel ? `${suggestion.department} – ${deptLabel}` : suggestion.department;
                    return (
                      <li key={idx} className={styles.suggestionItem}>
                        <span className={styles.suggestionName}>
                          <strong>{suggestion.name}</strong> ({displayDept})
                        </span>
                        <button
                          type="button"
                          className={styles.suggestionBtn}
                          onClick={() => handleShowSuggestion(suggestion.contact)}
                        >
                          Zobrazit výsledek
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <div className={styles.suggestionFooter}>
                  <span className={styles.footerText}>
                    Celkem nalezeno shody napříč všemi odděleními: <strong>{totalSuggestionsCount}</strong>
                  </span>
                  <button
                    type="button"
                    className={styles.globalSearchBtn}
                    onClick={handleGlobalSearchOnly}
                  >
                    Hledat bez filtru oddělení
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {!isLoading && displayedContacts.length > 0 && (
          selectedDepartment ? (
            <div className={styles.groupedResultsContainer}>
              {(() => {
                const groupedViews: React.ReactNode[] = [];
                const displayedGroupedIds = new Set<number>();
                
                const subDeptsToProcess = activeSubDepts.filter(
                  subDept => !selectedSubDepartment || subDept === selectedSubDepartment
                );

                subDeptsToProcess.forEach(subDept => {
                  const subDeptContacts = contacts.filter(c => {
                    if (subDept === 'ŘNM1' && isPastrnak(c)) {
                      return true;
                    }
                    return c.department === subDept;
                  });
                  if (subDeptContacts.length > 0) {
                    subDeptContacts.forEach(c => displayedGroupedIds.add(c.Id));
                    groupedViews.push(
                      <div key={subDept} className={styles.subDeptSectionGroup}>
                        <h3 className={styles.subDeptGroupHeader}>
                          {formatSubDeptButtonLabel(subDept)}
                        </h3>
                        <div className={styles.tableWrapper}>
                          <table className={styles.contactsTable}>
                            <thead>
                              <tr>
                                <th className={styles.colPhoto}>Fotografie</th>
                                <th className={styles.colFunction}>Funkce</th>
                                <th className={styles.colName}>Jméno</th>
                                <th className={styles.colEmail}>E-mail</th>
                                <th className={styles.colMobile}>Mobil</th>
                                <th className={styles.colDept}>Oddělení</th>
                                <th className={styles.colOffice}>Kancelář (budova)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {subDeptContacts.map(contact => renderContactRow(contact))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  }
                });

                // Find unmatched contacts (if any)
                const unmatchedContacts = contacts.filter(c => !displayedGroupedIds.has(c.Id));
                if (unmatchedContacts.length > 0) {
                  groupedViews.push(
                    <div key="unmatched" className={styles.subDeptSectionGroup}>
                      <h3 className={styles.subDeptGroupHeader}>
                        Ostatní
                      </h3>
                      <div className={styles.tableWrapper}>
                        <table className={styles.contactsTable}>
                          <thead>
                            <tr>
                              <th className={styles.colPhoto}>Fotografie</th>
                              <th className={styles.colFunction}>Funkce</th>
                              <th className={styles.colName}>Jméno</th>
                              <th className={styles.colEmail}>E-mail</th>
                              <th className={styles.colMobile}>Mobil</th>
                              <th className={styles.colDept}>Oddělení</th>
                              <th className={styles.colOffice}>Kancelář (budova)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {unmatchedContacts.map(contact => renderContactRow(contact))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                }

                return groupedViews;
              })()}
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.contactsTable}>
                <thead>
                  <tr>
                    <th className={styles.colPhoto}>Fotografie</th>
                    <th className={styles.colFunction}>Funkce</th>
                    <th className={styles.colName}>Jméno</th>
                    <th className={styles.colEmail}>E-mail</th>
                    <th className={styles.colMobile}>Mobil</th>
                    <th className={styles.colDept}>Oddělení</th>
                    <th className={styles.colOffice}>Kancelář (budova)</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedContacts.map(contact => renderContactRow(contact))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default ContactFiltering;