import { WebClient } from "@slack/web-api";
import config from "../../config";
import { SlackSecretsService } from "../secrets/slack-secrets.service";

const slackSecretsService = new SlackSecretsService();

export async function getSlackService(): Promise<WebClient> {
  const secrets = await slackSecretsService.retrieve();

  if (!secrets[config.slack.appId]) {
    throw new Error(`could not find secrets for appId '${config.slack.appId}'`);
  }

  const { token } = secrets[config.slack.appId];

  return new WebClient(token);
}
