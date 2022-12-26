import {
  createHandler,
  isSlackEventTypeOf,
  SlackEventBridgeEvent,
  SlackEventListenerLambda,
  SlackEventType,
} from "./lambda";

class EchoBackLambda extends SlackEventListenerLambda {
  constructor() {
    super({ lambdaName: "EchoBackLambda" });
  }

  protected async process(event: SlackEventBridgeEvent): Promise<void> {
    if (isSlackEventTypeOf(event, SlackEventType.APP_MENTION)) {
      console.log(JSON.stringify({ event }));
      console.log("got typed event: ", { text: event.detail.event.text });
    } else {
      console.log(JSON.stringify({ event }));
      console.log("unknown type of event!");
    }
  }
}

export const handler = createHandler(new EchoBackLambda());
