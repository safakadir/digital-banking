import { Operation } from '@digital-banking/models';
import { DepositCommand, WithdrawCommand } from '@digital-banking/commands';

/**
 * Interface for operation repository
 */
export interface IOperationRepository {
  /**
   * Get operation by ID
   * @param operationId - Operation ID
   * @returns Operation if found, null otherwise
   */
  getById(operationId: string): Promise<Operation | null>;

  /**
   * Update operation status
   * @param operationId - Operation ID
   * @param status - New status
   * @param errorMessage - Optional error message for failed operations
   */
  updateStatus(
    operationId: string, 
    status: 'pending' | 'completed' | 'failed',
    errorMessage?: string
  ): Promise<void>;

  /**
   * Create operation and send command atomically using outbox pattern
   * @param operation - Operation to create
   * @param command - Command to send via outbox
   */
  createWithCommand(operation: Operation, command: DepositCommand | WithdrawCommand): Promise<void>;
}
