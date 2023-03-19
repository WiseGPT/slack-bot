const envs = [
  "COMMAND_BUS_SQS",
  "EVENT_BUS_SQS",
  "DYNAMODB_TABLE_CONVERSATION_AGGREGATE",
  "DYNAMODB_TABLE_SLACK_CONVERSATION_VIEW",
  "DYNAMODB_INDEX_VIEW_CONVERSATION_ID",
  "OPENAI_LAMBDA_ARN",
  "OPENAI_SECRET_ARN",
  "SLACK_SECRET_ARN",
  "OAUTH_TABLE_NAME",
] as const;

export type EnvKey = (typeof envs)[number];

type Env = {
  [K in EnvKey]: string | undefined;
};

const env: Env = envs.reduce(
  (acc, envKey) => ({ ...acc, [envKey]: process.env[envKey] }),
  {} as Env
);

export function getEnv(key: EnvKey): string {
  if (env[key] === undefined) {
    throw new Error(`environment variable '${key}' not set`);
  }

  return env[key]!;
}
