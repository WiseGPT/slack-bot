import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";

type SecretObject = Record<string, string>;

export class SecretsManagerAdapter {
  constructor(
    private readonly secretArn: string,
    private readonly secretsManagerClient = new SecretsManagerClient({})
  ) {}

  async retrieve(): Promise<SecretObject> {
    const result = await this.secretsManagerClient.send(
      new GetSecretValueCommand({
        SecretId: this.secretArn,
      })
    );

    return JSON.parse(result.SecretString!);
  }
}
