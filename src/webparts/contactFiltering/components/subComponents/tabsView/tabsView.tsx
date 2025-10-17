import * as React from "react";
import { IPivotProps, Pivot, IPivotStyles } from "@fluentui/react";
import styles from './tabsView.module.scss';

export interface ITabsViewProps {
    children: React.ReactNode;
    pivotProps?: IPivotProps;
}

const TabsView: React.FC<ITabsViewProps> = (props) => {


    return (
        <Pivot
            aria-label="Page sections"
            linkFormat="tabs"
            {...props.pivotProps}
            styles={(theme): Partial<IPivotStyles> => ({
                root: {
                    paddingBottom: '10px'
                },
                itemContainer: styles.itemContainer
            })}
        >
            {props.children}
        </ Pivot>
    );
}


export default TabsView;