import { awscdk, javascript } from "projen";

const project = new awscdk.AwsCdkTypeScriptApp({
  cdkVersion: "2.58.0",
  defaultReleaseBranch: "main",
  appEntrypoint: "infrastructure/cdk/main.ts",

  github: true,
  lambdaAutoDiscover: false,

  minNodeVersion: "18.12.1",

  license: "Unlicense",

  name: "@wisegpt/slack-bot",
  packageName: "@wisegpt/slack-bot",
  packageManager: javascript.NodePackageManager.NPM,

  prettier: true,
  projenrcTs: true,
  release: true,

  deps: [
    "@wisegpt/awscdk-slack-event-bus",
    "@wisegpt/gpt-conversation-prompt",
    "@aws-sdk/client-secrets-manager",
    "@aws-sdk/client-dynamodb",
    "@aws-sdk/lib-dynamodb",
    "@aws-sdk/client-sqs",
    "@aws-sdk/client-lambda",
    "@slack/web-api",
    "openai",
    "gpt3-tokenizer",
  ],
  devDeps: ["@types/aws-lambda"],
});

project.synth();
