import { CrudDynamodbRepository } from "./crud-dynamodb-repository";
import { ConversationAggregate } from "../../domain/conversation/conversation.aggregate";

type DatabaseEntity = Pick<
  ConversationAggregate,
  "conversationId" | "status" | "messages" | "aiStatus"
>;

export class ConversationAggregateDynamodbRepository extends CrudDynamodbRepository<
  ConversationAggregate,
  DatabaseEntity
> {
  private static readonly TABLE_NAME =
    process.env.DYNAMODB_TABLE_CONVERSATION_AGGREGATE!;
  private static readonly PRIMARY_KEY = "conversationId";

  constructor() {
    super({
      tableName: ConversationAggregateDynamodbRepository.TABLE_NAME,
      primaryKey: ConversationAggregateDynamodbRepository.PRIMARY_KEY,
    });
  }

  protected fromDBItem(item: DatabaseEntity): ConversationAggregate {
    return new ConversationAggregate(
      item.conversationId,
      item.status,
      item.messages,
      item.aiStatus
    );
  }

  protected toDBItem(entity: ConversationAggregate): DatabaseEntity {
    return {
      conversationId: entity.conversationId,
      status: entity.status,
      messages: entity.messages,
      aiStatus: entity.aiStatus,
    };
  }
}
