import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { BaseEvent } from '@digital-banking/events';
import { v4 as uuidv4 } from 'uuid';

/**
 * Event publisher utility for sending events to SQS
 */
export class EventPublisher {
  private sqsClient: SQSClient;
  private eventQueueUrl: string;

  constructor(region = process.env.AWS_REGION || 'us-east-1') {
    this.sqsClient = new SQSClient({ region });
    // Get queue URL from environment variable or use default for local development
    this.eventQueueUrl = process.env.EVENT_QUEUE_URL || 'https://sqs.us-east-1.amazonaws.com/000000000000/event-queue';
  }

  /**
   * Publish an event to the event queue
   * @param event The event to publish
   */
  async publishEvent<T extends BaseEvent>(event: T): Promise<string> {
    const messageId = uuidv4();
    
    try {
      const command = new SendMessageCommand({
        QueueUrl: this.eventQueueUrl,
        MessageBody: JSON.stringify(event),
        MessageGroupId: event.type,
        MessageDeduplicationId: messageId,
      });

      const response = await this.sqsClient.send(command);
      return response.MessageId || messageId;
    } catch (error) {
      console.error('Error publishing event to SQS:', error);
      throw new Error(`Failed to publish event: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
