import { resolve } from "path";
import * as apigwv2 from "@aws-cdk/aws-apigatewayv2-alpha";
import {
  App,
  aws_lambda_event_sources as LambdaEventSources,
  Duration,
  Stack,
  StackProps,
} from "aws-cdk-lib";
import { AttributeType, BillingMode, Table } from "aws-cdk-lib/aws-dynamodb";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import { DeduplicationScope, Queue } from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";
import { CustomNodejsFunction } from "./custom-nodejs-function";
import { SlackResources } from "./slack-resources";
import config from "../../config";
import { EnvKey } from "../../env";

const CONVERSATION_LAMBDA_TIMEOUT = Duration.seconds(15);
const OPENAI_LAMBDA_TIMEOUT = Duration.seconds(30);

export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    const secret = Secret.fromSecretCompleteArn(
      this,
      "WiseGPTSecrets",
      config.aws.secretArn
    );

    const httpApi = new apigwv2.HttpApi(this, "HttpApi", {
      description: "Slack Bot Http Api",
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

    new SlackResources(this, {
      appId: config.slack.appId,
      authType: config.slack.authType,
      secret,
      httpApi,
      conversationCommandSQS,
      conversationEventSQS,
    });

    const openAILambda = new CustomNodejsFunction(this, "OpenAILambda", {
      entry: resolve(__dirname, "../lambdas/open-ai.lambda.ts"),
      description:
        "Listens and processes all OpenAI Commands like Completion and Summary",
      timeout: OPENAI_LAMBDA_TIMEOUT,
      environment: {
        OPENAI_SECRET_ARN: secret.secretArn,
        COMMAND_BUS_SQS: conversationCommandSQS.queueUrl,
      } as Record<EnvKey, string>,
    });

    const conversationLambda = new CustomNodejsFunction(
      this,
      "ConversationLambda",
      {
        entry: resolve(__dirname, "../lambdas/conversation.lambda.ts"),
        description: "Listens and processes Conversation API Commands",
        timeout: CONVERSATION_LAMBDA_TIMEOUT,
        environment: {
          EVENT_BUS_SQS: conversationEventSQS.queueUrl,
          DYNAMODB_TABLE_CONVERSATION_AGGREGATE:
            conversationAggregateTable.tableName,
          OPENAI_LAMBDA_ARN: openAILambda.functionArn,
        } as Record<EnvKey, string>,
      }
    );

    // openai lambda permissions
    secret.grantRead(openAILambda);
    conversationCommandSQS.grantSendMessages(openAILambda);

    // conversation api permissions
    conversationAggregateTable.grantReadWriteData(conversationLambda);
    conversationEventSQS.grantSendMessages(conversationLambda);
    openAILambda.grantInvoke(conversationLambda);

    // bind conversation api to queues
    conversationLambda.addEventSource(
      new LambdaEventSources.SqsEventSource(conversationCommandSQS, {
        enabled: true,
        batchSize: 1,
      })
    );
  }
}

const app = new App();

new MyStack(app, config.aws.stackName);

app.synth();
