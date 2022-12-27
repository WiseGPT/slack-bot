import { WebClient } from "@slack/web-api";
import { SlackSecretsService } from "../secrets/slack-secrets.service";
import config from "../../config";

const slackSecretsService = new SlackSecretsService();

export async function getSlackService(): Promise<WebClient> {
  const secrets = await slackSecretsService.retrieve();

  if (!secrets[config.appId]) {
    throw new Error(`could not find secrets for appId '${config.appId}'`);
  }

  const { token } = secrets[config.appId];

  return new WebClient(token);
}
