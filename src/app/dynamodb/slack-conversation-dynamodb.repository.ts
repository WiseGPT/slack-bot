import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import { SlackConversationView, ThreadId } from "../slack/slack.dto";

export class SlackConversationDynamodbRepository {
  private static readonly TABLE_NAME =
    process.env.DYNAMODB_TABLE_SLACK_CONVERSATION_VIEW;

  constructor(
    private readonly client = DynamoDBDocumentClient.from(
      new DynamoDBClient({})
    )
  ) {}

  async getById(
    threadId: ThreadId
  ): Promise<SlackConversationView | undefined> {
    const result = await this.client.send(
      new GetCommand({
        TableName: SlackConversationDynamodbRepository.TABLE_NAME,
        Key: { threadId },
      })
    );

    if (!result.Item) {
      return undefined;
    }

    return SlackConversationDynamodbRepository.fromDBItem(result.Item);
  }

  async create(entity: SlackConversationView): Promise<void> {
    await this.client.send(
      new PutCommand({
        TableName: SlackConversationDynamodbRepository.TABLE_NAME,
        Item: SlackConversationDynamodbRepository.toDBItem(entity),
        ConditionExpression: "attribute_not_exists(threadId)",
      })
    );
  }

  async update(entity: SlackConversationView): Promise<void> {
    await this.client.send(
      new PutCommand({
        TableName: SlackConversationDynamodbRepository.TABLE_NAME,
        Item: SlackConversationDynamodbRepository.toDBItem(entity),
      })
    );
  }

  static toDBItem(entity: SlackConversationView): any {
    return {
      ...entity,
      createdAt: entity.createdAt.toISOString(),
    };
  }

  static fromDBItem(item: any): SlackConversationView {
    return {
      ...item,
      createdAt: new Date(item.createdAt),
    };
  }
}
