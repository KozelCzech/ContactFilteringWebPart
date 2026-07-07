import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import {
  type IPropertyPaneConfiguration,
  PropertyPaneTextField
} from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';

import * as strings from 'ContactFilteringWebPartStrings';
import ContactFiltering from './components/ContactFiltering';
import { IContactFilteringProps } from './components/IContactFilteringProps';

import { spfi, SPFI, SPFx } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import '@pnp/sp/site-users/web';
import '@pnp/sp/fields';
import { graphfi, GraphFI, SPFx as graphSPFx, } from '@pnp/graph';
import { provisionLists } from '../../services/listProvisioningService';

export interface IContactFilteringWebPartProps {
  description: string;
}

export default class ContactFilteringWebPart extends BaseClientSideWebPart<IContactFilteringWebPartProps> {

  private _sp: SPFI;
  private _graph: GraphFI;

  public render(): void {
    const element: React.ReactElement<IContactFilteringProps> = React.createElement(
      ContactFiltering,
      {
        sp: this._sp,
        graph: this._graph,
        webAbsoluteUrl: this.context.pageContext.web.absoluteUrl,
        description: this.properties.description,
        userDisplayName: this.context.pageContext.user.displayName
      }
    );

    ReactDom.render(element, this.domElement);
  }

  protected async onInit(): Promise<void> {
    await super.onInit();
    this._sp = spfi().using(SPFx(this.context));
    this._graph = graphfi().using(graphSPFx(this.context));

    try {
      await provisionLists(this._sp);
    } catch (error) {
      console.error("List provisioning failed during onInit: ", error);
    }
  }


  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: [
        {
          header: {
            description: strings.PropertyPaneDescription
          },
          groups: [
            {
              groupName: strings.BasicGroupName,
              groupFields: [
                PropertyPaneTextField('description', {
                  label: strings.DescriptionFieldLabel
                })
              ]
            }
          ]
        }
      ]
    };
  }
}
