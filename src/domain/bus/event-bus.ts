import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import { defaultSQSClient } from "./sqs";
import { getEnv } from "../../env";

export type DomainEvent = any & { type: string; conversationId: string };

export class EventBus {
  private static readonly QUEUE_URL = getEnv("EVENT_BUS_SQS");

  constructor(private readonly sqsClient: SQSClient = defaultSQSClient) {}

  async publish(event: DomainEvent): Promise<void> {
    await this.sqsClient.send(
      new SendMessageCommand({
        QueueUrl: EventBus.QUEUE_URL,
        MessageBody: JSON.stringify(event),
        // TODO: find a more generic solution
        MessageGroupId: event.conversationId,
      })
    );
  }
}

export const globalEventBus = new EventBus();
