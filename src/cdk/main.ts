import {
  App,
  aws_events as Events,
  aws_events_targets as EventsTargets,
  CfnOutput,
  Stack,
  StackProps,
} from "aws-cdk-lib";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";
import { SlackEventBus } from "@wisegpt/awscdk-slack-event-bus";
import config from "../config";
import { CustomNodejsFunction } from "./custom-nodejs-function";
import { resolve } from "path";
import { AttributeType, BillingMode, Table } from "aws-cdk-lib/aws-dynamodb";

const WISEGPT_BOT_SECRETS_ARN =
  "arn:aws:secretsmanager:eu-west-1:197771300946:secret:wisegpt-bot-3yGDD6";

export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    const wisegptSecrets = Secret.fromSecretCompleteArn(
      this,
      "WiseGPTSecrets",
      WISEGPT_BOT_SECRETS_ARN
    );

    const slackEventBus = new SlackEventBus(this, "SlackEventBus", {
      tokenSecret: wisegptSecrets,
    });

    const slackConversationViewTable = new Table(
      this,
      "SlackConversationViewTable",
      {
        partitionKey: { name: "threadId", type: AttributeType.STRING },
        billingMode: BillingMode.PAY_PER_REQUEST,
      }
    );

    const echoBackLambda = new CustomNodejsFunction(this, "EchoBackLambda", {
      entry: resolve(__dirname, "../app/lambdas/echo-back.lambda.ts"),
      description: "Echo back whatever the user wrote",
      environment: {
        SLACK_SECRET_ARN: wisegptSecrets.secretArn,
        DYNAMODB_TABLE_SLACK_CONVERSATION_VIEW:
          slackConversationViewTable.tableName,
      },
    });

    wisegptSecrets.grantRead(echoBackLambda);
    slackConversationViewTable.grantReadWriteData(echoBackLambda);

    new Events.Rule(this, "SlackEventRule", {
      enabled: true,
      eventPattern: {
        source: ["com.slack"],
        detailType: ["EventCallback.message"],
      },
      targets: [new EventsTargets.LambdaFunction(echoBackLambda)],
      eventBus: slackEventBus.eventBus,
    });

    new CfnOutput(this, "SlackEventRequestUrl", {
      value: slackEventBus.slackEventsRequestUrl(config.appId),
      description: "Slack Events Request Url to use in Slack API Dashboard",
    });
  }
}

const app = new App();

new MyStack(app, "wisegpt-bot");

app.synth();
