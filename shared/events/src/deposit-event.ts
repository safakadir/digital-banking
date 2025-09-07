import { BaseEvent } from './base-event';

/**
 * Deposit event
 */
export interface DepositEvent extends BaseEvent {
  type: 'DEPOSIT_EVENT';
  accountId: string;
  userId: string;
  amount: number;
  operationId: string;
  transactionId: string;
  balance: number;
}
