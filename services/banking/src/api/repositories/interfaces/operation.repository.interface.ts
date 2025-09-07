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
   * Create operation and send command atomically using outbox pattern
   * @param operation - Operation to create
   * @param command - Command to send via outbox
   */
  createWithCommand(operation: Operation, command: DepositCommand | WithdrawCommand): Promise<void>;
}
