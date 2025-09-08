import { TelemetryBundle } from '@digital-banking/utils';
import { CloseAccountEvent } from '@digital-banking/events';

export class CloseAccountEventHandler {
  constructor(private readonly telemetry: TelemetryBundle) {}

  /**
   * Process a close account event
   */
  async handle(event: CloseAccountEvent): Promise<void> {
    const { logger } = this.telemetry;

    logger.info('Processing close account event', {
      eventId: event.id,
      accountId: event.accountId
    });

    // TODO: Implement close account event processing logic
    logger.info('Close account event processing completed', {
      eventId: event.id,
      accountId: event.accountId
    });
  }
}
