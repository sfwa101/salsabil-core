import { UIAction } from '../actions/action-contracts';

export type CapabilityHandler<TAction extends UIAction = UIAction> = (action: TAction) => void;

export class CapabilityRegistry {
  private handlers = new Map<UIAction['type'], CapabilityHandler<any>>();

  register<TType extends UIAction['type']>(
    actionType: TType,
    handler: CapabilityHandler<Extract<UIAction, { type: TType }>>
  ): void {
    this.handlers.set(actionType, handler);
  }

  getHandler(actionType: UIAction['type']): CapabilityHandler<any> | undefined {
    return this.handlers.get(actionType);
  }
}
