import { SecretsManagerAdapter } from "./secrets-manager-adapter";

type AppId = string;
type AppSecrets = { token: string };

export class SlackSecretsService {
  private static readonly SLACK_SECRET_ARN = process.env.SLACK_SECRET_ARN!;
  private static readonly TOKEN_REGEX = /^app\/(?<appId>[a-zA-Z0-9]+)\/token$/;
  private static readonly SLACK_SECRET_TTL = 60 * 1000;

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
        const match = SlackSecretsService.TOKEN_REGEX.exec(key);

        if (match && match.groups) {
          const { appId } = match.groups;

          curr[appId] = { token: value };
        }

        return curr;
      },
      {}
    );
  }
}
