import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { getEnv } from "../../../../env";
import { defaultDynamoDBDocumentClient } from "../../crud/dynamodb-clients";

export abstract class SlackOAuthBaseRepository {
  protected static readonly TABLE_NAME = getEnv("OAUTH_TABLE_NAME");
  protected static readonly PK_FIELD = "PK";
  protected static readonly SK_FIELD = "SK";
  // constant value to use for team installation SK
  protected static readonly SK_TEAM_ACCESS_CONST = "#TEAM#ACCESS";
  // prefix to use for individual user rows SK
  protected static readonly SK_USER_ACCESS_PREFIX_CONST = "#USRACC#";

  protected static buildPK(appId: string, teamId: string): string {
    return `${appId}#${teamId}`;
  }

  protected static buildSKTeamAccess(): string {
    return this.SK_TEAM_ACCESS_CONST;
  }

  protected static buildSKUserAccess(userId: string): string {
    return `${this.SK_USER_ACCESS_PREFIX_CONST}${userId}`;
  }

  protected constructor(
    protected pClient: DynamoDBDocumentClient = defaultDynamoDBDocumentClient
  ) {}
}
