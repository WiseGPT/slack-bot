import { resolve } from "path";
import * as apigwv2 from "@aws-cdk/aws-apigatewayv2-alpha";
import { HttpLambdaIntegration } from "@aws-cdk/aws-apigatewayv2-integrations-alpha";
import { SlackEventBus } from "@wisegpt/awscdk-slack-event-bus";
import {
  aws_events as Events,
  aws_events_targets as EventsTargets,
  aws_lambda_event_sources as LambdaEventSources,
  CfnOutput,
  Duration,
} from "aws-cdk-lib";
import {
  AttributeType,
  BillingMode,
  ProjectionType,
  Table,
} from "aws-cdk-lib/aws-dynamodb";
import { Alias } from "aws-cdk-lib/aws-lambda";
import { ISecret } from "aws-cdk-lib/aws-secretsmanager";
import { IQueue } from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";
import { CustomNodejsFunction } from "./custom-nodejs-function";
import { EnvKey } from "../../env";

const SLACK_ADAPTER_LAMBDA_TIMEOUT = Duration.seconds(15);
const CONVERSATION_ID_INDEX_NAME = "CONVERSATION_ID_INDEX";

type SlackResourcesProps = {
  appId: string;
  authType: "TOKEN_BASED" | "OAUTH_BASED";
  secret: ISecret;
  httpApi: apigwv2.HttpApi;
  conversationCommandSQS: IQueue;
  conversationEventSQS: IQueue;
};

export class SlackResources extends Construct {
  private static readonly SLACK_OAUTH_CALLBACK_PATH = "/slack/oauth/callback";
  private static readonly SLACK_EVENTS_PATH = "/slack/events";

  protected readonly pSlackAdapterLambda: CustomNodejsFunction;
  protected readonly pSlackAdapterLambdaAlias: Alias;

  constructor(scope: Construct, props: SlackResourcesProps) {
    super(scope, "SlackResources");

    const slackEventBus = new SlackEventBus(this, "SlackEventBus", {
      secret: props.secret,
      httpApi: props.httpApi,
      singleApp: {
        appId: props.appId,
        eventsApiPath: SlackResources.SLACK_EVENTS_PATH,
      },
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

    this.pSlackAdapterLambda = new CustomNodejsFunction(
      this,
      "SlackAdapterLambda",
      {
        entry: resolve(__dirname, "../lambdas/slack-adapter.lambda.ts"),
        description:
          "Listens and processes Slack Events, Slack oAuth calls and Conversation API events",
        timeout: SLACK_ADAPTER_LAMBDA_TIMEOUT,
        environment: {
          SLACK_SECRET_ARN: props.secret.secretArn,
          COMMAND_BUS_SQS: props.conversationCommandSQS.queueUrl,
          DYNAMODB_TABLE_SLACK_CONVERSATION_VIEW:
            slackConversationViewTable.tableName,
          DYNAMODB_INDEX_VIEW_CONVERSATION_ID: CONVERSATION_ID_INDEX_NAME,
        } as Record<EnvKey, string>,
      }
    );

    this.pSlackAdapterLambdaAlias = new Alias(
      this,
      "SlackHandlerLambdaLiveAlias",
      {
        aliasName: "latest",
        version: this.pSlackAdapterLambda.currentVersion,
      }
    );

    // slack adapter permissions
    props.secret.grantRead(this.pSlackAdapterLambdaAlias);
    slackConversationViewTable.grantReadWriteData(
      this.pSlackAdapterLambdaAlias
    );
    props.conversationCommandSQS.grantSendMessages(
      this.pSlackAdapterLambdaAlias
    );

    // bind slack adapter to queues
    new Events.Rule(this, "SlackEventRule", {
      enabled: true,
      eventPattern: {
        source: ["com.slack"],
        detailType: ["EventCallback.message"],
      },
      targets: [
        new EventsTargets.LambdaFunction(this.pSlackAdapterLambdaAlias),
      ],
      eventBus: slackEventBus.eventBus,
    });

    this.pSlackAdapterLambdaAlias.addEventSource(
      new LambdaEventSources.SqsEventSource(props.conversationEventSQS, {
        enabled: true,
        batchSize: 1,
      })
    );

    this.addOAuthResourcesIfNecessary(props);

    new CfnOutput(this, "SlackEventRequestUrl", {
      value: slackEventBus.slackEventsRequestUrl(props.appId),
      description: "Slack Events Request Url to use in Slack API Dashboard",
    });
  }

  private addOAuthResourcesIfNecessary(props: SlackResourcesProps) {
    if (props.authType === "TOKEN_BASED") {
      this.pSlackAdapterLambda.addEnvironment(
        "OAUTH_TABLE_NAME",
        "not-configured-for-oAuth"
      );

      return;
    }

    const oAuthTable = new Table(this, "oAuthTable", {
      partitionKey: { name: "PK", type: AttributeType.STRING },
      sortKey: { name: "SK", type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
    });

    oAuthTable.grantReadWriteData(this.pSlackAdapterLambdaAlias);

    this.pSlackAdapterLambda.addEnvironment(
      "OAUTH_TABLE_NAME",
      oAuthTable.tableName
    );

    // add for handling slack oauth callbacks
    props.httpApi.addRoutes({
      path: SlackResources.SLACK_OAUTH_CALLBACK_PATH,
      methods: [apigwv2.HttpMethod.GET],
      integration: new HttpLambdaIntegration(
        "OAuthCallbackIntegration",
        this.pSlackAdapterLambdaAlias
      ),
    });

    new CfnOutput(this, "SlackOAuthCallbackUrl", {
      value: `${props.httpApi.apiEndpoint}${SlackResources.SLACK_OAUTH_CALLBACK_PATH}`,
      description: "Slack Events Request Url to use in Slack API Dashboard",
    });
  }
}
