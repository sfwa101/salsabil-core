import { UIAction } from '../actions/action-contracts';
import { CapabilityRegistry } from './CapabilityRegistry';

export class ActionRouter {
  constructor(private registry: CapabilityRegistry) {}

  dispatch(action: UIAction): void {
    const handler = this.registry.getHandler(action.type);
    
    if (handler) {
      handler(action);
    } else {
      // Safe default behavior as required: No-op + development diagnostic
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`[ActionRouter] Unhandled action type: ${action.type}. No capability registered.`);
      }
    }
  }
}
