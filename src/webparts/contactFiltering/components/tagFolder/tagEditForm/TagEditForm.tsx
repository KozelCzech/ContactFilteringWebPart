import * as React from 'react';
import styles from './TagEditForm.module.scss';
import { ITag } from '../TagHolder';
import { SPFI } from '@pnp/sp';
import { SPHttpClientResponse } from '@microsoft/sp-http';
import { useEffect, useState } from 'react';
import { TextField, IColor, PrimaryButton, Spinner, SpinnerSize, ColorPicker, Callout } from '@fluentui/react';
import { getContrastColor, isValidColor } from '../../../../../utils/colorUtils';
import { ColorFilled } from '@fluentui/react-icons';

export interface ITagEditFormProps {
    tag: ITag;
    sp: SPFI;
    onTagSaved: (newTag: ITag) => void;
}

export interface IDefaultColor {
    Id: number;
    Title: string;
}


const TagEditForm: React.FC<ITagEditFormProps> = (props) => {
    const defaultColor: string = "#0366d6";

    const [ editTag, setEditTag ] = useState<ITag>(props.tag);
    const [ isEdit, setIsEdit ] = useState<boolean>(props.tag.Id !== 0);
    const [ isSaving, setIsSaving ] = useState<boolean>(false);
    const [ errorMessage, setErrorMessage ] = useState<string>("");
    
    const [ previewColor, setPreviewColor ] = useState<string>(defaultColor);
    const [ defaultColors, setDefaultColors ] = useState<IDefaultColor[]>([]);

    const [ colorText, setColorText ] = useState<string>(defaultColor);
    const [ isColorPickerOpen, setIsColorPickerOpen ] = useState<boolean>(false);
    const colorPickerButtonRef = React.useRef<HTMLButtonElement>(null);



    const fetchDefaultColors = async (): Promise<void> => {
        try {
            const colorQuery = props.sp.web.lists.getByTitle("DefaultColor").items.select(
                "Id",
                "Title"
            );

            const colors: IDefaultColor[] = await colorQuery();
            setDefaultColors(colors);
        } catch (error) {
            console.error("Error getting default colors: ", error);
        }
    }


    const onTagNameChange = (ev: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string): void => {
        setEditTag({ ...editTag, TagName: newValue || '' });

        if (errorMessage && newValue && newValue.length > 0) {
            setErrorMessage("");
        }
    };

    const onCommentChange = (ev: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string): void => {
        setEditTag({ ...editTag, Comment: newValue || '' });
    };

    const onColorChange = (ev: React.SyntheticEvent<HTMLElement>, colorObj: IColor): void => {
        const newColor = '#' + colorObj.hex;
        setEditTag({ ...editTag, tagColor: newColor });
        setPreviewColor(newColor);
        setColorText(newColor);
    };

    const onHexChange = (ev: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string): void => {
        setColorText(newValue || "");
        if (newValue && isValidColor(newValue)){
            setEditTag({ ...editTag, tagColor: newValue || "" });
            setPreviewColor(newValue || "");
        }
    };

    const onDefaultColorClick = (color: IDefaultColor): void => {
        setEditTag({ ...editTag, tagColor: color.Title });
        setPreviewColor(color.Title);
        setColorText(color.Title);
    };

    const addTag = async (): Promise<void> => {
        setIsSaving(true);
        try {
            const list = props.sp.web.lists.getByTitle("Tags");
            const newItemData: ITag = {
                Id: editTag.Id,
                Title: editTag.Title,
                TagName: editTag.TagName,
                Comment: editTag.Comment,
                tagColor: editTag.tagColor
            }

            
            //Required form items
            if (!newItemData.TagName) {
                console.error("Tag name cannot be empty.");
                setErrorMessage("Tag name cannot be empty.");
                setIsSaving(false); // Ensure saving state is reset
                return;
            }

            if (editTag.Id === 0) {    
                await list.items.add(newItemData);
                props.onTagSaved(newItemData);
            } else {
                await list.items.getById(editTag.Id).update(newItemData);
                props.onTagSaved(newItemData);
            }

        } catch (error) {
            console.error("Error adding/updating tag: ", error);
            if (error instanceof SPHttpClientResponse) {
                const errorDetails = await error.json();
                setErrorMessage(`Error: ${errorDetails.error.message}`);
            } else {
                setErrorMessage("An unexpected error occurred. Please try again.");
            }
            setIsSaving(false);
            return;
        }
    };


    useEffect(() => {
        fetchDefaultColors().catch(console.error);
        setEditTag(props.tag);

        if (props.tag.Id === 0) {
            setIsEdit(false);
        } else {
            setIsEdit(true);
            setColorText(props.tag.tagColor);
            setPreviewColor(props.tag.tagColor);
        }

    }, [props.tag]);


    return (
        <div>
            {isSaving ? (
                <Spinner size={SpinnerSize.small} label="Saving..."/>
            ) : (
                <>
                    <h3 className={styles.previewTitle}>PREVIEW</h3>
                    <div className={styles.preview}>
                        <p
                        className={styles.tagName} 
                        style={{
                            backgroundColor: previewColor,
                            color: getContrastColor(previewColor)
                        }}>{editTag.TagName ? editTag.TagName : "Your Tag Name"}</p>
                    </div>
                    <div className={styles.InputContainer}>
                        <div className={styles.textInputContainer}>
                            <TextField 
                            label="Tag name" 
                                value={editTag.TagName} 
                                onChange={onTagNameChange} 
                                errorMessage={errorMessage}
                                required 
                                autoFocus
                                placeholder='e.g., Project Manager'
                            />
                            <TextField 
                                label="Comment" 
                                value={editTag.Comment} 
                                onChange={onCommentChange} 
                                multiline
                                rows={9}
                                autoAdjustHeight
                                placeholder='a short description of this tag'
                            />
                        </div>
                        <div>
                            <h4>Tag color</h4>
                            <div className={styles.defaultColorContainer}>
                                {defaultColors.length > 0 ? 
                                    defaultColors.map((color: IDefaultColor) => 
                                        <button 
                                            type="button"
                                            title={color.Title}
                                            key={color.Id} 
                                            style={{
                                                backgroundColor: color.Title,
                                                outlineColor: color.Title,
                                            }}
                                            onClick={() => onDefaultColorClick(color)}
                                            className={`
                                                ${styles.defaultColorSwatch}
                                                ${color.Title === editTag.tagColor ? styles.selected : ''}
                                                `}
                                        />
                                    ): <p>No default colors available</p>
                                }
                            </div>
                            <div className={styles.colorPickerContainer}>
                                <TextField 
                                    label='Hex'
                                    value={colorText}
                                    onChange={onHexChange}
                                /> 
                                <button ref={colorPickerButtonRef} className={styles.colorPickerButton} onClick={() => setIsColorPickerOpen(!isColorPickerOpen)}><ColorFilled /></button>
                                {isColorPickerOpen && (
                                    <Callout
                                        target={colorPickerButtonRef.current}
                                        onDismiss={() => setIsColorPickerOpen(false)}
                                        setInitialFocus
                                    >
                                        <ColorPicker
                                            color={editTag.tagColor}
                                            onChange={onColorChange}
                                            alphaType="none"
                                            showPreview={true}
                                            styles={{
                                                // This will hide the "Hex" label   in the header
                                                tableHexCell: {
                                                    display: 'none',
                                                },
                                                // This will hide the first cell in the table body, which is the hex input
                                                table: {
                                                    selectors: {
                                                        'tbody > tr > td:first-child': {
                                                            display: 'none',
                                                        },
                                                    },
                                                },
                                            }}
                                        />
                                    </Callout>
                                )}
                            </div>
                        </div>
                    </div>
                    <PrimaryButton 
                        text={isEdit ? "Save Changes" : "Add Tag"}
                        onClick={addTag}
                        disabled={isSaving || !editTag.TagName || !editTag.tagColor}
                    />
                </>
            )}
        </div>
    );
};

export default TagEditForm;