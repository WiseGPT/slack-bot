import {
  createHandler,
  isSlackEventTypeOf,
  SlackEventBridgeEvent,
  SlackEventListenerLambda,
  SlackEventType,
} from "./lambda";
import config from "../../config";
import { slackService } from "../slack/slack.service";

class EchoBackLambda extends SlackEventListenerLambda {
  private static readonly STRIP_MENTIONS = /<@[^>]+>\s*/g;

  constructor() {
    super({ lambdaName: "EchoBackLambda" });
  }

  protected async process(event: SlackEventBridgeEvent): Promise<void> {
    console.log(JSON.stringify({ event }));

    if (isSlackEventTypeOf(event, SlackEventType.MESSAGE)) {
      const messageEvent = event.detail.event;

      if (messageEvent.app_id === config.appId) {
        console.log("bot will not respond to the messages it sent");

        return;
      }

      if (messageEvent.subtype) {
        console.log("bot will not do anything for messages with subtype");

        return;
      }

      if (!messageEvent.thread_ts) {
        console.log(
          "bot will not do anything because message is not to a thread"
        );

        return;
      }

      return this.replyToThread(event, messageEvent.thread_ts);
    } else if (isSlackEventTypeOf(event, SlackEventType.APP_MENTION)) {
      const appMentionEvent = event.detail.event;

      if (appMentionEvent.thread_ts) {
        console.log("we do not care about mentions in threads");

        return;
      }

      return this.createNewConversation(event, appMentionEvent.ts);
    } else {
      console.log("unknown type of event");
    }
  }

  private async sendEcho(
    event: SlackEventBridgeEvent<
      SlackEventType.MESSAGE | SlackEventType.APP_MENTION
    >,
    thread_ts: string,
    extra: string
  ): Promise<void> {
    const { channel, user, text } = event.detail.event;

    const echoText = `<@${user}> [${extra}] ${text.replace(
      EchoBackLambda.STRIP_MENTIONS,
      ""
    )}`;

    await slackService.chat.postMessage({
      channel,
      thread_ts,
      text: echoText,
    });
  }

  private async replyToThread(
    event: SlackEventBridgeEvent<SlackEventType.MESSAGE>,
    thread_ts: string
  ) {
    await this.sendEcho(event, thread_ts, "REPLY");
  }

  private async createNewConversation(
    event: SlackEventBridgeEvent<SlackEventType.APP_MENTION>,
    ts: string
  ) {
    await this.sendEcho(event, ts, "NEW_CONVERSATION");
  }
}

export const handler = createHandler(new EchoBackLambda());
