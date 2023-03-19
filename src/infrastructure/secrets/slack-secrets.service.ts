import { SecretsManagerAdapter } from "./secrets-manager-adapter";
import { getEnv } from "../../env";

type AppId = string;
type AppSecrets = {
  token?: string;
  clientId?: string;
  clientSecret?: string;
};

export class SlackSecretsService {
  private static readonly SLACK_SECRET_ARN = getEnv("SLACK_SECRET_ARN");
  private static readonly APP_SECRET_REGEX =
    /^app\/(?<appId>[a-zA-Z0-9]+)\/(?<secretName>token|client-id|client-secret)$/;
  private static readonly SLACK_SECRET_TTL = 60 * 1000;

  private static getFieldNameBySecretName(
    secretName: string
  ): keyof AppSecrets {
    switch (secretName) {
      case "token":
        return "token";
      case "client-id":
        return "clientId";
      case "client-secret":
        return "clientSecret";
      default:
        throw new Error("unknown secret name");
    }
  }

  private cache:
    | { promise: Promise<Record<AppId, AppSecrets>>; time: number }
    | undefined;

  constructor(
    private readonly secretsManagerAdapter = new SecretsManagerAdapter(
      SlackSecretsService.SLACK_SECRET_ARN
    )
  ) {}

  async retrieve(): Promise<Record<AppId, AppSecrets>> {
    const currentTime = Date.now();
    if (
      this.cache &&
      // cache not expired
      Date.now() - this.cache.time < SlackSecretsService.SLACK_SECRET_TTL
    ) {
      return this.cache.promise;
    }

    this.cache = { promise: this.retrieveAndParseSecret(), time: currentTime };

    return this.cache.promise;
  }

  private async retrieveAndParseSecret() {
    const secretObject = await this.secretsManagerAdapter.retrieve();

    return Object.entries(secretObject).reduce<Record<AppId, AppSecrets>>(
      (curr, [key, value]) => {
        const match = SlackSecretsService.APP_SECRET_REGEX.exec(key);

        if (match && match.groups) {
          const { appId, secretName } = match.groups;

          curr[appId] = {
            ...curr[appId],
            [SlackSecretsService.getFieldNameBySecretName(secretName)]: value,
          };
        }

        return curr;
      },
      {}
    );
  }
}

const defaultSlackSecretsService = new SlackSecretsService();

export default defaultSlackSecretsService;
