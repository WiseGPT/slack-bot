import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import { NativeAttributeValue } from "@aws-sdk/util-dynamodb";

type CrudDynamodbRepositoryConfig = {
  tableName: string;
  primaryKey: string;
};

export abstract class CrudDynamodbRepository<
  TDomainEntity,
  TDatabaseEntity extends Record<string, NativeAttributeValue> = Record<
    string,
    NativeAttributeValue
  >
> {
  protected constructor(
    protected readonly config: CrudDynamodbRepositoryConfig,
    protected readonly client = DynamoDBDocumentClient.from(
      new DynamoDBClient({})
    )
  ) {}

  async getById(id: string): Promise<TDomainEntity | undefined> {
    const result = await this.client.send(
      new GetCommand({
        TableName: this.config.tableName,
        Key: { [this.config.primaryKey]: id },
      })
    );

    if (!result.Item) {
      return undefined;
    }

    return this.fromDBItem(result.Item as TDatabaseEntity);
  }

  async create(entity: TDomainEntity): Promise<void> {
    await this.client.send(
      new PutCommand({
        TableName: this.config.tableName,
        Item: this.toDBItem(entity),
        ConditionExpression: `attribute_not_exists(${this.config.primaryKey})`,
      })
    );
  }

  async update(entity: TDomainEntity): Promise<void> {
    await this.client.send(
      new PutCommand({
        TableName: this.config.tableName,
        Item: this.toDBItem(entity),
      })
    );
  }

  protected abstract toDBItem(entity: TDomainEntity): TDatabaseEntity;
  protected abstract fromDBItem(item: TDatabaseEntity): TDomainEntity;
}
