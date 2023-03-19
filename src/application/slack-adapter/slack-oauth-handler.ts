import type * as Lambda from "aws-lambda";
import config from "../../config";
import { SlackOAuthReaderRepository } from "../../infrastructure/dynamodb/slack/oauth/slack-oauth-reader.repository";
import { SlackOAuthWriterRepository } from "../../infrastructure/dynamodb/slack/oauth/slack-oauth-writer.repository";
import {
  OAuthV2AccessOutput,
  TeamAccess,
  UserAccess,
} from "../../infrastructure/slack/oauth/oauth.dto";
import { SlackOAuthService } from "../../infrastructure/slack/oauth/slack-oauth-service";

export class SlackOAuthHandler {
  private static readonly APP_ID = config.slack.appId;

  private static mergeTeamAccess(
    { accessToken, authedUser: { id: userId }, scopes }: OAuthV2AccessOutput,
    teamAccess: TeamAccess
  ): TeamAccess {
    return {
      ...teamAccess,
      accessToken: accessToken ?? null,
      authedUsers: teamAccess.authedUsers.add(userId),
      scopes: new Set(scopes),
    };
  }

  private static mergeUserAccess(
    { authedUser: { accessToken, scopes } }: OAuthV2AccessOutput,
    userAccess: UserAccess
  ): UserAccess {
    return {
      ...userAccess,
      accessToken: accessToken ?? null,
      scopes: new Set(scopes),
    };
  }

  private static createInitialTeamAccess({
    appId,
    team: { id: teamId },
    accessToken,
    authedUser: { id: userId },
    scopes,
  }: OAuthV2AccessOutput): TeamAccess {
    return {
      appId,
      teamId,
      accessToken: accessToken ?? null,
      authedUsers: new Set([userId]),
      scopes: new Set(scopes),
    };
  }

  private static createInitialUserAccess({
    appId,
    team: { id: teamId },
    authedUser: { id: userId, accessToken, scopes },
  }: OAuthV2AccessOutput): UserAccess {
    return {
      appId,
      teamId,
      userId,
      accessToken: accessToken ?? null,
      scopes: new Set(scopes),
    };
  }

  constructor(
    private readonly slackOAuthService: SlackOAuthService = new SlackOAuthService(),
    private readonly slackOAuthReaderRepository: SlackOAuthReaderRepository = new SlackOAuthReaderRepository(),
    private readonly slackOAuthWriterRepository: SlackOAuthWriterRepository = new SlackOAuthWriterRepository()
  ) {}

  async handle(
    event: Lambda.APIGatewayProxyEventV2
  ): Promise<Lambda.APIGatewayProxyStructuredResultV2> {
    const code = event.queryStringParameters?.code;
    if (!code) {
      throw new Error("invalid redirect from slack. code was not set.");
    }

    const oAuthV2AccessOutput = await this.slackOAuthService.oauthV2Access({
      code,
      appId: SlackOAuthHandler.APP_ID,
    });

    const {
      team: { id: teamId },
      authedUser: { id: userId },
    } = oAuthV2AccessOutput;

    const [teamAccess, userAccess] = await Promise.all([
      this.slackOAuthReaderRepository.getTeamAccess(
        SlackOAuthHandler.APP_ID,
        teamId
      ),
      this.slackOAuthReaderRepository.getUserAccess(
        SlackOAuthHandler.APP_ID,
        teamId,
        userId
      ),
    ]);

    await Promise.all([
      this.updateAndSaveTeamAccess(
        { appId: SlackOAuthHandler.APP_ID, teamId },
        teamAccess,
        oAuthV2AccessOutput
      ),
      this.updateAndSaveUserAccess(
        { appId: SlackOAuthHandler.APP_ID, teamId, userId },
        userAccess,
        oAuthV2AccessOutput
      ),
    ]);

    // TODO: send event when a new oAuth installation is done
    // await this.slackEventBusService.send(
    //   {
    //     type: "oauth_access",
    //     api_app_id: SlackOAuthHandler.APP_ID,
    //     team_id: teamId,
    //     authed_user: { id: userId },
    //   },
    //   new Date()
    // );

    return {
      statusCode: 200,
      body: JSON.stringify({
        ...oAuthV2AccessOutput,
        accessToken: undefined,
        authedUser: {
          ...oAuthV2AccessOutput.authedUser,
          accessToken: undefined,
        },
      }),
      headers: {
        "Content-Type": "application/json",
      },
    };
  }

  private async updateAndSaveTeamAccess(
    { appId, teamId }: { appId: string; teamId: string },
    teamAccess: TeamAccess | undefined,
    oAuthV2AccessOutput: OAuthV2AccessOutput
  ) {
    const updatedTeamAccess = teamAccess
      ? SlackOAuthHandler.mergeTeamAccess(oAuthV2AccessOutput, teamAccess)
      : SlackOAuthHandler.createInitialTeamAccess(oAuthV2AccessOutput);

    await this.slackOAuthWriterRepository.putTeamAccess(
      appId,
      teamId,
      updatedTeamAccess
    );
  }

  private async updateAndSaveUserAccess(
    {
      appId,
      teamId,
      userId,
    }: { appId: string; teamId: string; userId: string },
    userAccess: UserAccess | undefined,
    oAuthV2AccessOutput: OAuthV2AccessOutput
  ) {
    const updatedUserAccess = userAccess
      ? SlackOAuthHandler.mergeUserAccess(oAuthV2AccessOutput, userAccess)
      : SlackOAuthHandler.createInitialUserAccess(oAuthV2AccessOutput);

    await this.slackOAuthWriterRepository.putUserAccess(
      appId,
      teamId,
      userId,
      updatedUserAccess
    );
  }
}
