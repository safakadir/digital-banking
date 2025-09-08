import { AccountStatus } from '@digital-banking/models';

/**
 * Minimal account projection for banking service
 * Only stores essential data for ownership validation and status checks
 */
export interface AccountProjection {
  accountId: string;
  userId: string;
  status: AccountStatus;
  name: string;
}
