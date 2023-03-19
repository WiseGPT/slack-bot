import { WebClient } from "@slack/web-api";
import config from "../../config";
import { SlackOAuthReaderRepository } from "../dynamodb/slack/oauth/slack-oauth-reader.repository";
import defaultSlackSecretsService, {
  SlackSecretsService,
} from "../secrets/slack-secrets.service";

function assertSlackAuthTypeUnreachable(value: never): never {
  throw new Error(`unknown type of slack auth type: '${value}'`);
}

export class SlackWebClientFactory {
  private static readonly SLACK_APP_ID = config.slack.appId;
  private static readonly SLACK_AUTH_TYPE = config.slack.authType;

  constructor(
    private readonly slackSecretService: SlackSecretsService = defaultSlackSecretsService,
    private readonly slackOAuthReaderRepository: SlackOAuthReaderRepository = new SlackOAuthReaderRepository()
  ) {}

  async create({ teamId }: { teamId: string }): Promise<WebClient> {
    switch (SlackWebClientFactory.SLACK_AUTH_TYPE) {
      case "TOKEN_BASED":
        return this.createTokenBasedWebClient();
      case "OAUTH_BASED":
        return this.createOAuthBasedWebClient({ teamId });
      default:
        return assertSlackAuthTypeUnreachable(
          SlackWebClientFactory.SLACK_AUTH_TYPE
        );
    }
  }

  private async createTokenBasedWebClient(): Promise<WebClient> {
    const secrets = await this.slackSecretService.retrieve();

    if (!secrets[SlackWebClientFactory.SLACK_APP_ID]) {
      throw new Error(
        `could not find secrets for appId '${SlackWebClientFactory.SLACK_APP_ID}'`
      );
    }

    const { token } = secrets[SlackWebClientFactory.SLACK_APP_ID];

    return new WebClient(token);
  }

  private async createOAuthBasedWebClient({
    teamId,
  }: {
    teamId: string;
  }): Promise<WebClient> {
    const teamAccess = await this.slackOAuthReaderRepository.getTeamAccess(
      SlackWebClientFactory.SLACK_APP_ID,
      teamId
    );

    if (teamAccess === undefined) {
      throw new Error(
        `the team '${teamId}' did not install the slack application`
      );
    }

    const { accessToken } = teamAccess;

    if (!accessToken) {
      throw new Error(
        `the team '${teamId}' installed the application but there is no access token. oauth possibly misconfigured`
      );
    }

    return new WebClient(accessToken);
  }
}

const defaultSlackWebClientFactory = new SlackWebClientFactory();

export default defaultSlackWebClientFactory;
