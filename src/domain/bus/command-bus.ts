import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import { defaultSQSClient } from "./sqs";

export type DomainCommand = any & { type: string; conversationId: string };

export class CommandBus {
  private static readonly QUEUE_URL = process.env.COMMAND_BUS_SQS!;

  constructor(private readonly sqsClient: SQSClient = defaultSQSClient) {}

  async send(cmd: DomainCommand): Promise<void> {
    await this.sqsClient.send(
      new SendMessageCommand({
        QueueUrl: CommandBus.QUEUE_URL,
        MessageBody: JSON.stringify(cmd),
        // TODO: find a more generic solution
        MessageGroupId: cmd.conversationId,
      })
    );
  }
}

export const globalCommandBus = new CommandBus();
