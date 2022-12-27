import {
  createHandler,
  isSlackEventTypeOf,
  SlackEventBridgeEvent,
  SlackEventListenerLambda,
  SlackEventType,
} from "./lambda";
import { slackService } from "../slack/slack.service";

class EchoBackLambda extends SlackEventListenerLambda {
  private static readonly STRIP_MENTIONS = /<@[^>]+>\s*/g;

  constructor() {
    super({ lambdaName: "EchoBackLambda" });
  }

  protected async process(event: SlackEventBridgeEvent): Promise<void> {
    if (isSlackEventTypeOf(event, SlackEventType.APP_MENTION)) {
      console.log(JSON.stringify({ event }));
      console.log("got typed event: ", { text: event.detail.event.text });
      const appMentionEvent = event.detail.event;

      const { channel, user, text } = appMentionEvent;
      const thread_ts = appMentionEvent.thread_ts ?? appMentionEvent.ts;

      const echoText = `<@${user}> ${text.replace(
        EchoBackLambda.STRIP_MENTIONS,
        ""
      )}`;

      await slackService.chat.postMessage({
        channel,
        thread_ts,
        text: echoText,
      });
    } else {
      console.log(JSON.stringify({ event }));
      console.log("unknown type of event!");
    }
  }
}

export const handler = createHandler(new EchoBackLambda());
