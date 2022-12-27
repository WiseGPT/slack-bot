import {
  createHandler,
  isSlackEventTypeOf,
  SlackEventBridgeEvent,
  SlackEventListenerLambda,
  SlackEventType,
} from "./lambda";
import { slackService } from "../slack/slack.service";
import config from "../../config";

class EchoBackLambda extends SlackEventListenerLambda {
  private static readonly STRIP_MENTIONS = /<@[^>]+>\s*/g;

  constructor() {
    super({ lambdaName: "EchoBackLambda" });
  }

  protected async process(event: SlackEventBridgeEvent): Promise<void> {
    if (isSlackEventTypeOf(event, SlackEventType.MESSAGE)) {
      console.log(JSON.stringify({ event }));
      const appMentionEvent = event.detail.event;

      if (appMentionEvent.app_id === config.appId) {
        console.log("bot will not respond to the messages it sent");

        return;
      }

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
