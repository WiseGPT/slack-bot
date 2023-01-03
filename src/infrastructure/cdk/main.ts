import { resolve } from "path";
import { SlackEventBus } from "@wisegpt/awscdk-slack-event-bus";
import {
  App,
  aws_events as Events,
  aws_events_targets as EventsTargets,
  aws_lambda_event_sources as LambdaEventSources,
  CfnOutput,
  Duration,
  Stack,
  StackProps,
} from "aws-cdk-lib";
import {
  AttributeType,
  BillingMode,
  ProjectionType,
  Table,
} from "aws-cdk-lib/aws-dynamodb";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import { DeduplicationScope, Queue } from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";
import config from "../../config";
import { CustomNodejsFunction } from "./custom-nodejs-function";

const CONVERSATION_ID_INDEX_NAME = "CONVERSATION_ID_INDEX";
const CONVERSATION_LAMBDA_TIMEOUT = Duration.seconds(15);

export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    const secret = Secret.fromSecretCompleteArn(
      this,
      "WiseGPTSecrets",
      config.aws.secretArn
    );

    const slackEventBus = new SlackEventBus(this, "SlackEventBus", {
      tokenSecret: secret,
    });

    const slackConversationViewTable = new Table(
      this,
      "SlackConversationViewTable",
      {
        partitionKey: { name: "threadId", type: AttributeType.STRING },
        billingMode: BillingMode.PAY_PER_REQUEST,
      }
    );

    slackConversationViewTable.addGlobalSecondaryIndex({
      indexName: CONVERSATION_ID_INDEX_NAME,
      projectionType: ProjectionType.ALL,
      partitionKey: { name: "conversationId", type: AttributeType.STRING },
    });

    const conversationAggregateTable = new Table(
      this,
      "ConversationAggregateTable",
      {
        partitionKey: { name: "PK", type: AttributeType.STRING },
        sortKey: { name: "SK", type: AttributeType.NUMBER },
        billingMode: BillingMode.PAY_PER_REQUEST,
      }
    );

    const conversationCommandSQS = new Queue(this, "ConversationCommandSQS", {
      fifo: true,
      deduplicationScope: DeduplicationScope.MESSAGE_GROUP,
      // TODO: figure out a better way
      contentBasedDeduplication: true,
      visibilityTimeout: CONVERSATION_LAMBDA_TIMEOUT,
    });

    const conversationEventSQS = new Queue(this, "ConversationEventSQS", {
      fifo: true,
      deduplicationScope: DeduplicationScope.MESSAGE_GROUP,
      // TODO: figure out a better way
      contentBasedDeduplication: true,
    });

    const slackAdapterLambda = new CustomNodejsFunction(
      this,
      "SlackAdapterLambda",
      {
        entry: resolve(__dirname, "../lambdas/slack-adapter.lambda.ts"),
        description:
          "Listens an processes Slack Events API events and Conversation API events",
        environment: {
          SLACK_SECRET_ARN: secret.secretArn,
          COMMAND_BUS_SQS: conversationCommandSQS.queueUrl,
          DYNAMODB_TABLE_SLACK_CONVERSATION_VIEW:
            slackConversationViewTable.tableName,
          DYNAMODB_INDEX_VIEW_CONVERSATION_ID: CONVERSATION_ID_INDEX_NAME,
        },
      }
    );

    const conversationLambda = new CustomNodejsFunction(
      this,
      "ConversationLambda",
      {
        entry: resolve(__dirname, "../lambdas/conversation.lambda.ts"),
        description: "Listens and processes Conversation API Commands",
        timeout: CONVERSATION_LAMBDA_TIMEOUT,
        environment: {
          EVENT_BUS_SQS: conversationEventSQS.queueUrl,
          OPENAI_SECRET_ARN: secret.secretArn,
          DYNAMODB_TABLE_CONVERSATION_AGGREGATE:
            conversationAggregateTable.tableName,
        },
      }
    );

    // slack adapter permissions
    secret.grantRead(slackAdapterLambda);
    slackConversationViewTable.grantReadWriteData(slackAdapterLambda);
    conversationCommandSQS.grantSendMessages(slackAdapterLambda);

    // conversation api permissions
    secret.grantRead(conversationLambda);
    conversationAggregateTable.grantReadWriteData(conversationLambda);
    conversationEventSQS.grantSendMessages(conversationLambda);

    // bind slack adapter to queues
    new Events.Rule(this, "SlackEventRule", {
      enabled: true,
      eventPattern: {
        source: ["com.slack"],
        detailType: ["EventCallback.message"],
      },
      targets: [new EventsTargets.LambdaFunction(slackAdapterLambda)],
      eventBus: slackEventBus.eventBus,
    });

    slackAdapterLambda.addEventSource(
      new LambdaEventSources.SqsEventSource(conversationEventSQS, {
        enabled: true,
        batchSize: 1,
      })
    );

    // bind conversation api to queues
    conversationLambda.addEventSource(
      new LambdaEventSources.SqsEventSource(conversationCommandSQS, {
        enabled: true,
        batchSize: 1,
      })
    );

    new CfnOutput(this, "SlackEventRequestUrl", {
      value: slackEventBus.slackEventsRequestUrl(config.slack.appId),
      description: "Slack Events Request Url to use in Slack API Dashboard",
    });
  }
}

const app = new App();

new MyStack(app, config.aws.stackName);

app.synth();
