import { BaseEvent } from './base-event';

/**
 * Deposit event
 */
export interface DepositEvent extends BaseEvent {
  type: 'DEPOSIT_EVENT';
  accountId: string;
  amount: number;
  operationId: string;
}
