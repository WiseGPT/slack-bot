import { awscdk, javascript } from "projen";

const CDK_VERSION = "2.56.1";

const project = new awscdk.AwsCdkTypeScriptApp({
  cdkVersion: CDK_VERSION,
  defaultReleaseBranch: "main",
  appEntrypoint: "cdk/main.ts",

  github: true,
  lambdaAutoDiscover: false,

  minNodeVersion: "18.12.1",

  name: "wisegpt-bot",
  packageManager: javascript.NodePackageManager.NPM,

  prettier: true,
  projenrcTs: true,
  release: true,

  deps: [
    "@wisegpt/awscdk-slack-event-bus",
    "@aws-sdk/client-secrets-manager",
    "@aws-sdk/client-dynamodb",
    "@aws-sdk/lib-dynamodb",
    "@slack/web-api",
  ],
  devDeps: ["@types/aws-lambda"],
});

project.synth();
