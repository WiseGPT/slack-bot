import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import { defaultSQSClient } from "./sqs";
import { getEnv } from "../../env";

export type DomainCommand = { type: string; conversationId: string };

export class CommandBus<T extends DomainCommand> {
  private static readonly QUEUE_URL = getEnv("COMMAND_BUS_SQS");

  constructor(private readonly sqsClient: SQSClient = defaultSQSClient) {}

  async send(cmd: T): Promise<void> {
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

export const globalCommandBus = new CommandBus<any>();
