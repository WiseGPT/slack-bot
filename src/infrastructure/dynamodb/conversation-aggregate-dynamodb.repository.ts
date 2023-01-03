import {
  DynamoDBClient,
  QueryCommand,
  TransactWriteItem,
  TransactWriteItemsCommand,
} from "@aws-sdk/client-dynamodb";
import { ConversationAggregate } from "../../domain/conversation/conversation.aggregate";

export class ConversationAggregateDynamodbRepository {
  private static readonly TABLE_NAME =
    process.env.DYNAMODB_TABLE_CONVERSATION_AGGREGATE!;
  private static readonly PK = "PK";
  private static readonly SK = "SK";

  private static eventPK(conversationId: string): string {
    return `EVENT#${conversationId}`;
  }

  constructor(protected readonly client = new DynamoDBClient({})) {}

  async load(
    conversationId: string
  ): Promise<ConversationAggregate | undefined> {
    const result = await this.client.send(
      new QueryCommand({
        TableName: ConversationAggregateDynamodbRepository.TABLE_NAME,
        KeyConditionExpression: `${ConversationAggregateDynamodbRepository.PK} = :conversationId`,
        ExpressionAttributeValues: {
          ":conversationId": {
            S: ConversationAggregateDynamodbRepository.eventPK(conversationId),
          },
        },
      })
    );

    if (!Array.isArray(result.Items) || result.Items.length < 1) {
      return undefined;
    }

    const events = result.Items.map((item) => JSON.parse(item.Data.S!));
    const aggregate = ConversationAggregate.load(conversationId);

    for (const event of events) {
      aggregate.apply(event);
    }

    return aggregate;
  }

  async save(aggregate: ConversationAggregate): Promise<void> {
    const items: TransactWriteItem[] = aggregate.events.map((event) => ({
      Put: {
        TableName: ConversationAggregateDynamodbRepository.TABLE_NAME,
        Item: {
          [ConversationAggregateDynamodbRepository.PK]: {
            S: ConversationAggregateDynamodbRepository.eventPK(
              event.conversationId
            ),
          },
          [ConversationAggregateDynamodbRepository.SK]: {
            N: event.eventId.toString(),
          },
          Data: { S: JSON.stringify(event) },
        },
      },
    }));

    await this.client.send(
      new TransactWriteItemsCommand({ TransactItems: items })
    );
  }
}
