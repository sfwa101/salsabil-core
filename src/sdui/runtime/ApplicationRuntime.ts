import { UIAction } from '../actions/action-contracts';
import { ActionRouter } from './ActionRouter';
import { CapabilityRegistry, CapabilityHandler } from './CapabilityRegistry';

export class ApplicationRuntime {
  private registry: CapabilityRegistry;
  private router: ActionRouter;

  constructor() {
    this.registry = new CapabilityRegistry();
    this.router = new ActionRouter(this.registry);
  }

  registerCapability<TType extends UIAction['type']>(
    actionType: TType,
    handler: CapabilityHandler<Extract<UIAction, { type: TType }>>
  ): void {
    this.registry.register(actionType, handler);
  }

  dispatch = (action: UIAction): void => {
    this.router.dispatch(action);
  };
}
