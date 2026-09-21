import { ReactNode } from 'react';
import { SDUISection } from '../schema/page.schema';
import { UIAction } from '../actions/action-contracts';

export interface SDUIComponentProps<T = any> {
  sectionId: string;
  props: T;
  onAction?: (action: UIAction) => void;
}

export type SDUIComponent<T = any> = React.FC<SDUIComponentProps<T>>;

export interface SDUIComponentRegistry {
  register<T>(type: SDUISection['type'], component: SDUIComponent<T>): void;
  get(type: SDUISection['type']): SDUIComponent | undefined;
  has(type: SDUISection['type']): boolean;
}
