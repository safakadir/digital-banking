import { BaseEvent } from './base-event';

/**
 * Close account event
 */
export interface CloseAccountEvent extends BaseEvent {
  type: 'CLOSE_ACCOUNT_EVENT';
  accountId: string;
  reason?: string;
}
