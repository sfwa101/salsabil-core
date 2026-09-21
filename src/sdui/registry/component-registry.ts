import { SDUIComponent, SDUIComponentRegistry } from '../contracts/component-contracts';
import { SDUISection } from '../schema/page.schema';

class Registry implements SDUIComponentRegistry {
  private components = new Map<SDUISection['type'], SDUIComponent>();

  register<T>(type: SDUISection['type'], component: SDUIComponent<T>): void {
    if (this.components.has(type)) {
      console.warn(`[SDUI Registry] Component for type '${type}' is already registered and will be overwritten.`);
    }
    this.components.set(type, component);
  }

  get(type: SDUISection['type']): SDUIComponent | undefined {
    return this.components.get(type);
  }

  has(type: SDUISection['type']): boolean {
    return this.components.has(type);
  }
}

export const componentRegistry = new Registry();
