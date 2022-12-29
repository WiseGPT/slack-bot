import { CrudDynamodbRepository } from "./crud-dynamodb-repository";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { SlackConversationView } from "../../domain/slack-adapter/slack-adapter.dto";

type DatabaseEntity = Omit<
  SlackConversationView,
  "createdAt" | "botMessages"
> & {
  botMessages: Record<
    string,
    {
      ts: string;
      createdAt: string;
      status: "REQUESTED" | "RESPONDED" | "PRECEDED";
    }
  >;
  createdAt: string;
};

export class SlackConversationDynamodbRepository extends CrudDynamodbRepository<
  SlackConversationView,
  DatabaseEntity
> {
  private static readonly TABLE_NAME =
    process.env.DYNAMODB_TABLE_SLACK_CONVERSATION_VIEW!;
  private static readonly CONVERSATION_ID_INDEX =
    process.env.DYNAMODB_INDEX_VIEW_CONVERSATION_ID!;
  private static readonly PRIMARY_KEY = "threadId";
  private static readonly CONVERSATION_ID_FIELD = "conversationId";

  constructor() {
    super({
      tableName: SlackConversationDynamodbRepository.TABLE_NAME,
      primaryKey: SlackConversationDynamodbRepository.PRIMARY_KEY,
    });
  }

  async getByConversationId(
    conversationId: string
  ): Promise<SlackConversationView | undefined> {
    const result = await this.client.send(
      new QueryCommand({
        TableName: this.config.tableName,
        IndexName: SlackConversationDynamodbRepository.CONVERSATION_ID_INDEX,
        KeyConditionExpression: `${SlackConversationDynamodbRepository.CONVERSATION_ID_FIELD} = :conversationId`,
        ExpressionAttributeValues: {
          ":conversationId": conversationId,
        },
      })
    );

    if (!result.Items || result.Items.length < 1) {
      return undefined;
    }

    return this.fromDBItem(result.Items[0] as DatabaseEntity);
  }

  protected fromDBItem(item: DatabaseEntity): SlackConversationView {
    return {
      ...item,
      createdAt: new Date(item.createdAt),
      botMessages: Object.entries(item.botMessages).reduce(
        (curr, [key, { ts, status, createdAt }]) => ({
          ...curr,
          [key]: { ts, status, createdAt: new Date(createdAt) },
        }),
        {}
      ),
    };
  }

  protected toDBItem(entity: SlackConversationView): DatabaseEntity {
    return {
      ...entity,
      createdAt: entity.createdAt.toISOString(),
      botMessages: Object.entries(entity.botMessages).reduce(
        (curr, [key, { ts, status, createdAt }]) => ({
          ...curr,
          [key]: { ts, status, createdAt: createdAt.toISOString() },
        }),
        {}
      ),
    };
  }
}
