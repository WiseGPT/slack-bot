import {
  createHandler,
  isSlackEventTypeOf,
  SlackMessageEventPayload,
  SlackEventBridgeEvent,
  SlackEventListenerLambda,
  SlackEventType,
} from "./lambda";
import config from "../../config";
import { getSlackService } from "../slack/slack.service";

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
        const firstMentionedUser =
          EchoBackLambda.tryGetMessageStartingMention(messageEvent);

        if (
          firstMentionedUser === undefined ||
          firstMentionedUser.userId !== EchoBackLambda.getAuthUserId(event)
        ) {
          console.log(
            "all non-thread messages should start by mentioning the bot or they won't be used"
          );

          return;
        }

        return this.createNewConversation(event, messageEvent.ts);
      }

      return this.replyToThread(event, messageEvent.thread_ts);
    } else {
      console.log("unknown type of event");
    }
  }

  private static tryGetMessageStartingMention(
    appMentionEvent: SlackMessageEventPayload
  ): { userId: string } | undefined {
    const block: any = appMentionEvent.blocks?.[0];

    if (block?.type !== "rich_text") {
      return undefined;
    }

    const element = block.elements?.[0];

    if (element?.type !== "rich_text_section") {
      return undefined;
    }

    const userElement = element.elements?.[0];

    return userElement?.type === "user"
      ? { userId: userElement.user_id }
      : undefined;
  }

  private static getAuthUserId(
    event: SlackEventBridgeEvent
  ): string | undefined {
    const { authorizations } = event.detail;
    const authorization = authorizations?.[0];

    return authorization?.is_bot ? authorization?.user_id : undefined;
  }

  private async sendEcho(
    event: SlackEventBridgeEvent<SlackEventType.MESSAGE>,
    thread_ts: string,
    extra: string
  ): Promise<void> {
    const slackService = await getSlackService();

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
    event: SlackEventBridgeEvent<SlackEventType.MESSAGE>,
    ts: string
  ) {
    await this.sendEcho(event, ts, "NEW_CONVERSATION");
  }
}

export const handler = createHandler(new EchoBackLambda());
