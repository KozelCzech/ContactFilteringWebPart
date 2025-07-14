import * as React from 'react';
import { ITag } from '../TagHolder';
import { SPFI } from '@pnp/sp';
import { useEffect, useState } from 'react';
import { ColorPicker, TextField, IColor, PrimaryButton, Spinner, SpinnerSize } from '@fluentui/react';

export interface ITagEditFormProps {
    tag: ITag;
    sp: SPFI;
    onTagSaved: (newTag: ITag) => void;
}


const TagEditForm: React.FC<ITagEditFormProps> = (props) => {
    const [ editTag, setEditTag ] = useState<ITag>(props.tag);
    const [ buttonText, setButtonText ] = useState<string>("Save Tag");
    const [ isSaving, setIsSaving ] = useState<boolean>(false);

    const onTagNameChange = (ev: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string): void => {
        setEditTag({ ...editTag, TagName: newValue || '' });
    };

    const onCommentChange = (ev: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string): void => {
        setEditTag({ ...editTag, Comment: newValue || '' });
    };

    const onColorChange = (ev: React.SyntheticEvent<HTMLElement>, colorObj: IColor): void => {
        // The hex value from the color object doesn't include the '#', so we add it.
        setEditTag({ ...editTag, tagColor: '#' + colorObj.hex });
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

            if (editTag.Id === 0) {    
                await list.items.add(newItemData);
                props.onTagSaved(newItemData);
            } else {
                await list.items.getById(editTag.Id).update(newItemData);
                props.onTagSaved(editTag);
            }

        } catch (error) {
            console.error("Error adding tag: ", error);
            setIsSaving(false);
        }
    };


    useEffect(() => {
        setEditTag(props.tag);

        if (props.tag.Id === 0) {
            setButtonText("Add Tag");
        } else {
            setButtonText("Save Tag");
        }

    }, [props.tag]);


    return (
        <div>
            <p>Edit Tag</p>
            <TextField label="Tag name" value={editTag.TagName} onChange={onTagNameChange} required/>
            <TextField label="Comment" value={editTag.Comment} onChange={onCommentChange} required/>
            <ColorPicker color={editTag.tagColor} onChange={onColorChange} alphaType="none"/>
            <PrimaryButton 
                text={isSaving ? "Saving..." : buttonText}
                onClick={addTag}
                disabled={isSaving}
            />
            {isSaving && <Spinner size={SpinnerSize.small} />}
        </div>
    );
};

export default TagEditForm;