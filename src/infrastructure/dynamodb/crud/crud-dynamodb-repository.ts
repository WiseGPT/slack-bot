import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { defaultDynamoDBDocumentClient } from "./dynamodb-clients";

type CrudDynamodbRepositoryConfig = {
  tableName: string;
  primaryKey: string;
};

export abstract class CrudDynamodbRepository<
  TDomainEntity,
  TDatabaseEntity extends Record<string, any> = Record<string, any>
> {
  protected constructor(
    protected readonly config: CrudDynamodbRepositoryConfig,
    protected readonly client = defaultDynamoDBDocumentClient
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
