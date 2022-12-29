import { awscdk, javascript } from "projen";

const project = new awscdk.AwsCdkTypeScriptApp({
  cdkVersion: "2.58.0",
  defaultReleaseBranch: "main",
  appEntrypoint: "infrastructure/cdk/main.ts",

  github: true,
  lambdaAutoDiscover: false,

  minNodeVersion: "18.12.1",

  name: "@wisegpt/slack-bot",
  packageName: "@wisegpt/slack-bot",
  packageManager: javascript.NodePackageManager.NPM,

  prettier: true,
  projenrcTs: true,
  release: true,

  deps: [
    "@wisegpt/awscdk-slack-event-bus",
    "@aws-sdk/client-secrets-manager",
    "@aws-sdk/client-dynamodb",
    "@aws-sdk/lib-dynamodb",
    "@aws-sdk/client-sqs",
    "@slack/web-api",
    "openai",
  ],
  devDeps: ["@types/aws-lambda"],
});

project.synth();
