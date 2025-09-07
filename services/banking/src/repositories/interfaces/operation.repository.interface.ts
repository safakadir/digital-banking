import { Operation } from '@digital-banking/models';

/**
 * Interface for operation repository
 */
export interface IOperationRepository {
  /**
   * Create a new operation record
   * @param operation - Operation to create
   */
  create(operation: Operation): Promise<void>;

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
}
