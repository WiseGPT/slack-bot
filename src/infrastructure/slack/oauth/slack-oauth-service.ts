import { OAuthV2AccessOutput } from "./oauth.dto";
import { slackOAuthV2Access } from "./slack-oauth-v2-access";
import defaultSlackSecretsService, {
  SlackSecretsService,
} from "../../secrets/slack-secrets.service";

export class SlackOAuthService {
  constructor(
    private readonly slackSecretsService: SlackSecretsService = defaultSlackSecretsService
  ) {}

  async oauthV2Access(input: {
    code: string;
    appId: string;
  }): Promise<OAuthV2AccessOutput> {
    const appSecrets = await this.getOrFailAppSecrets(input.appId);
    if (!appSecrets.clientId || !appSecrets.clientSecret) {
      throw new Error(
        `both client-id and client-secret needs to be set for appId '${input.appId}'`
      );
    }

    return slackOAuthV2Access({
      clientId: appSecrets.clientId,
      clientSecret: appSecrets.clientSecret,
      code: input.code,
    });
  }

  private async getOrFailAppSecrets(appId: string) {
    const appSecretsMap = await this.slackSecretsService.retrieve();
    const appSecrets = appSecretsMap[appId];

    if (appSecrets === undefined) {
      throw new Error(
        `unknown appId '${appId}', insert necessary credentials for the given app`
      );
    }

    return appSecrets;
  }
}
