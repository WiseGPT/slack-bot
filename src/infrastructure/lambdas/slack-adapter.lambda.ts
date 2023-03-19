import type * as Lambda from "aws-lambda";
import {
  createHandler,
  EventListenerLambda,
  isSlackEventTypeOf,
  SlackEventBridgeEvent,
  SQSEvent,
} from "./lambda";
import { ConversationEventHandler } from "../../application/slack-adapter/conversation-event-handler";
import { SlackEventHandler } from "../../application/slack-adapter/slack-event-handler";
import { SlackOAuthHandler } from "../../application/slack-adapter/slack-oauth-handler";
import { DomainEvent } from "../../domain/bus/event-bus";
import { SlackEventType } from "../../domain/slack-adapter/slack-adapter.dto";

class SlackAdapterLambda extends EventListenerLambda<SlackEventBridgeEvent> {
  constructor(
    private readonly slackEventHandler: SlackEventHandler = new SlackEventHandler(),
    private readonly slackOAuthHandler: SlackOAuthHandler = new SlackOAuthHandler(),
    private readonly conversationEventHandler: ConversationEventHandler = new ConversationEventHandler()
  ) {
    super({ lambdaName: "SlackAdapterLambda" });
  }

  protected handleAPIGatewayProxyEvent(
    event: Lambda.APIGatewayProxyEventV2
  ): Promise<Lambda.APIGatewayProxyStructuredResultV2> {
    try {
      return this.slackOAuthHandler.handle(event);
    } catch (err) {
      // TODO: add better error handling, DLQ etc.
      console.error(
        JSON.stringify({
          ...this.baseProps,
          method: "handleAPIGatewayProxyEvent",
          // TODO: add better logger
          err: JSON.parse(JSON.stringify(err, Object.getOwnPropertyNames(err))),
        })
      );

      throw err;
    }
  }

  protected async handleEventBridgeEvent(
    event: SlackEventBridgeEvent
  ): Promise<void> {
    try {
      if (isSlackEventTypeOf(event, SlackEventType.MESSAGE)) {
        await this.slackEventHandler.handleSlackMessageEvent(event.detail);
      } else {
        console.log("unknown type of event");
      }
    } catch (err) {
      // TODO: add better error handling, DLQ etc.
      console.error(
        JSON.stringify({
          ...this.baseProps,
          method: "handleEventBridgeEvent",
          // TODO: add better logger
          err: JSON.parse(JSON.stringify(err, Object.getOwnPropertyNames(err))),
        })
      );
    }
  }

  protected async handleSQSEvent({ Records }: SQSEvent) {
    try {
      const event: DomainEvent = JSON.parse(Records[0].body);

      await this.conversationEventHandler.handle(event);
    } catch (err) {
      // TODO: add better error handling, DLQ etc.
      console.error(
        JSON.stringify({
          ...this.baseProps,
          method: "handleSQSEvent",
          // TODO: add better logger
          err: JSON.parse(JSON.stringify(err, Object.getOwnPropertyNames(err))),
        })
      );
    }
  }
}

export const handler = createHandler(new SlackAdapterLambda());
