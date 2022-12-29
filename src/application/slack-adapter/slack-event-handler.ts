import crypto from "crypto";
import config from "../../config";
import { CommandBus, globalCommandBus } from "../../domain/bus/command-bus";
import { SlackMessageEventWithEnvelope } from "../../domain/slack-adapter/slack-adapter.dto";
import { SlackConversationDynamodbRepository } from "../../infrastructure/dynamodb/slack-conversation-dynamodb.repository";

export class SlackEventHandler {
  private static readonly STRIP_INITIAL_MENTION_REGEX = /^(\s*<@[^>]+>\s*)/;

  private static tryGetMessageStartingMention(
    envelope: SlackMessageEventWithEnvelope
  ): { userId: string } | undefined {
    const block: any = envelope.event.blocks?.[0];

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

  private static getAuthUserId({
    authorizations,
  }: SlackMessageEventWithEnvelope): string | undefined {
    const authorization = authorizations?.[0];

    return authorization?.is_bot ? authorization?.user_id : undefined;
  }

  private static stripInitialMention(text: string): string {
    return text.replace(this.STRIP_INITIAL_MENTION_REGEX, "");
  }

  constructor(
    private readonly repository = new SlackConversationDynamodbRepository(),
    private readonly commandBus: CommandBus = globalCommandBus
  ) {}

  async handleSlackMessageEvent(
    envelope: SlackMessageEventWithEnvelope
  ): Promise<void> {
    const messageEvent = envelope.event;

    if (messageEvent.app_id === config.slack.appId) {
      console.log("bot will not respond to the messages it sent");

      return;
    }

    if (messageEvent.subtype) {
      console.log("bot will not do anything for messages with subtype");

      return;
    }

    if (!messageEvent.thread_ts) {
      const firstMentionedUser =
        SlackEventHandler.tryGetMessageStartingMention(envelope);

      if (
        firstMentionedUser === undefined ||
        firstMentionedUser.userId !== SlackEventHandler.getAuthUserId(envelope)
      ) {
        console.log(
          "all non-thread messages should start by mentioning the bot or they won't be used"
        );

        return;
      }

      return this.createNewConversation(envelope, messageEvent.ts);
    }

    return this.replyToThread(envelope, messageEvent.thread_ts);
  }

  private async replyToThread(
    { event }: SlackMessageEventWithEnvelope,
    thread_ts: string
  ) {
    const slackConversationView = await this.repository.getById(thread_ts);

    if (slackConversationView?.status === "CREATED") {
      await this.commandBus.send({
        type: "ADD_USER_MESSAGE_COMMAND",
        conversationId: slackConversationView.conversationId,
        message: {
          id: event.ts,
          author: { userId: event.user },
          text: SlackEventHandler.stripInitialMention(event.text),
        },
      });
    }
  }

  private async createNewConversation(
    { event }: SlackMessageEventWithEnvelope,
    ts: string
  ) {
    await this.commandBus.send({
      type: "CREATE_CONVERSATION_COMMAND",
      conversationId: crypto.randomUUID(),
      initialMessage: {
        id: event.ts,
        author: { userId: event.user },
        text: SlackEventHandler.stripInitialMention(event.text),
      },
      metadata: {
        threadId: ts,
        channel: event.channel,
      },
    });
  }
}