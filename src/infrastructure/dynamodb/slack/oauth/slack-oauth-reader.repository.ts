import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { SlackOAuthBaseRepository } from "./slack-oauth-base-repository";
import { TeamAccess, UserAccess } from "../../../slack/oauth/oauth.dto";

export class SlackOAuthReaderRepository extends SlackOAuthBaseRepository {
  constructor() {
    super();
  }

  async getTeamAccess(
    appId: string,
    teamId: string
  ): Promise<TeamAccess | undefined> {
    const pk = SlackOAuthBaseRepository.buildPK(appId, teamId);
    const sk = SlackOAuthBaseRepository.buildSKTeamAccess();

    const result = await this.pClient.send(
      new GetCommand({
        TableName: SlackOAuthBaseRepository.TABLE_NAME,
        Key: {
          [SlackOAuthBaseRepository.PK_FIELD]: pk,
          [SlackOAuthBaseRepository.SK_FIELD]: sk,
        },
      })
    );

    if (!result.Item) {
      return undefined;
    }

    const {
      [SlackOAuthReaderRepository.PK_FIELD]: _pk,
      [SlackOAuthReaderRepository.SK_FIELD]: _sk,
      ...rest
    } = result.Item;

    return rest as TeamAccess;
  }

  async getUserAccess(
    appId: string,
    teamId: string,
    userId: string
  ): Promise<UserAccess | undefined> {
    const pk = SlackOAuthBaseRepository.buildPK(appId, teamId);
    const sk = SlackOAuthBaseRepository.buildSKUserAccess(userId);

    const result = await this.pClient.send(
      new GetCommand({
        TableName: SlackOAuthBaseRepository.TABLE_NAME,
        Key: {
          [SlackOAuthBaseRepository.PK_FIELD]: pk,
          [SlackOAuthBaseRepository.SK_FIELD]: sk,
        },
      })
    );

    if (!result.Item) {
      return undefined;
    }

    const {
      [SlackOAuthReaderRepository.PK_FIELD]: _pk,
      [SlackOAuthReaderRepository.SK_FIELD]: _sk,
      ...rest
    } = result.Item;

    return rest as UserAccess;
  }
}
