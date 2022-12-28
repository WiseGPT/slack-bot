import {
  createHandler,
  EventListenerLambda,
  isSlackEventTypeOf,
  SlackEventBridgeEvent,
  SQSEvent,
} from "./lambda";
import { SlackEventHandler } from "../../domain/slack-adapter/slack-event-handler";
import { SlackEventType } from "../../domain/slack-adapter/slack-adapter.dto";
import { ConversationEventHandler } from "../../domain/slack-adapter/conversation-event-handler";
import { DomainEvent } from "../../domain/bus/event-bus";

class SlackAdapterLambda extends EventListenerLambda<SlackEventBridgeEvent> {
  constructor(
    private readonly slackEventHandler: SlackEventHandler = new SlackEventHandler(),
    private readonly conversationEventHandler: ConversationEventHandler = new ConversationEventHandler()
  ) {
    super({ lambdaName: "SlackAdapterLambda" });
  }

  protected async handleEventBridgeEvent(
    event: SlackEventBridgeEvent
  ): Promise<void> {
    if (isSlackEventTypeOf(event, SlackEventType.MESSAGE)) {
      await this.slackEventHandler.handleSlackMessageEvent(event.detail);
    } else {
      console.log("unknown type of event");
    }
  }

  protected async handleSQSEvent({ Records }: SQSEvent) {
    const event: DomainEvent = JSON.parse(Records[0].body);

    await this.conversationEventHandler.handle(event);
  }
}

export const handler = createHandler(new SlackAdapterLambda());
