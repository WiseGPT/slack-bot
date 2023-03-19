import { SecretsManagerAdapter } from "./secrets-manager-adapter";
import { getEnv } from "../../env";

export class OpenAiSecretsService {
  private static readonly OPEN_AI_SECRET_ARN = getEnv("OPENAI_SECRET_ARN");
  private static readonly SECRET_KEY_PATH = "open-ai/secret-key";
  private static readonly SECRET_TTL = 60 * 1000;

  private cache:
    | { promise: Promise<{ apiKey: string }>; time: number }
    | undefined;

  constructor(
    private readonly secretsManagerAdapter = new SecretsManagerAdapter(
      OpenAiSecretsService.OPEN_AI_SECRET_ARN
    )
  ) {}

  async retrieve(): Promise<{ apiKey: string }> {
    const currentTime = Date.now();
    if (
      this.cache &&
      // cache not expired
      Date.now() - this.cache.time < OpenAiSecretsService.SECRET_TTL
    ) {
      return this.cache.promise;
    }

    this.cache = { promise: this.retrieveAndParseSecret(), time: currentTime };

    return this.cache.promise;
  }

  private async retrieveAndParseSecret() {
    const secretObject = await this.secretsManagerAdapter.retrieve();

    return {
      apiKey: secretObject[OpenAiSecretsService.SECRET_KEY_PATH],
    };
  }
}
