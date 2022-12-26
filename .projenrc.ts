import { awscdk, javascript } from "projen";

const CDK_VERSION = "2.56.1";

const project = new awscdk.AwsCdkTypeScriptApp({
  cdkVersion: CDK_VERSION,
  defaultReleaseBranch: "main",
  appEntrypoint: "cdk/main.ts",

  github: true,
  lambdaAutoDiscover: false,

  name: "wisegpt-bot",
  packageManager: javascript.NodePackageManager.NPM,

  prettier: true,
  projenrcTs: true,
  release: true,

  deps: ["@wisegpt/awscdk-slack-event-bus"],
  // description: undefined,  /* The description is just a string that helps people understand the purpose of the package. */
  // devDeps: [],             /* Build dependencies for this module. */
  // packageName: undefined,  /* The "name" in package.json. */
});

project.synth();
