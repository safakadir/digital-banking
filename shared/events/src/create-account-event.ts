import { BaseEvent } from './base-event';

/**
 * Create account event
 */
export interface CreateAccountEvent extends BaseEvent {
  type: 'CREATE_ACCOUNT_EVENT';
  accountId: string;
  userId: string;
  name: string;
  currency: string;
}
