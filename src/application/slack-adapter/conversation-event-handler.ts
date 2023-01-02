import { DomainEvent } from "../../domain/bus/event-bus";
import {
  BotResponseAdded,
  BotResponseRequested,
  ConversationStarted,
} from "../../domain/conversation/conversation.dto";
import { SlackConversationView } from "../../domain/slack-adapter/slack-adapter.dto";
import { SlackConversationDynamodbRepository } from "../../infrastructure/dynamodb/slack-conversation-dynamodb.repository";
import { SlackMessageHelpers } from "../../infrastructure/slack/slack-message-helpers";
import { getSlackService } from "../../infrastructure/slack/slack.service";

export class ConversationEventHandler {
  constructor(
    private readonly repository: SlackConversationDynamodbRepository = new SlackConversationDynamodbRepository()
  ) {}

  async handle(event: DomainEvent): Promise<void> {
    switch (event.type) {
      case "CONVERSATION_STARTED":
        return this.handleConversationStarted(event);
      case "BOT_RESPONSE_REQUESTED":
        return this.handleBotResponseRequested(event);
      case "BOT_RESPONSE_ADDED":
        return this.handleBotResponseAdded(event);
    }
  }

  private async handleConversationStarted(
    event: ConversationStarted
  ): Promise<void> {
    await this.repository.create({
      conversationId: event.conversationId,
      threadId: event.metadata.threadId,
      channel: event.metadata.channel,
      botUserId: event.metadata.botUserId,
      status: "CREATED",
      createdAt: new Date(),
      botMessages: {},
    });
  }

  private async handleBotResponseRequested(
    event: BotResponseRequested
  ): Promise<void> {
    const [view, slackService] = await Promise.all([
      this.getOrFailByConversationId(event.conversationId),
      getSlackService(),
    ]);

    const response = await slackService.chat.postMessage({
      thread_ts: view.threadId,
      channel: view.channel,
      ...SlackMessageHelpers.createInitialMessage(),
    });

    await this.repository.update({
      ...view,
      botMessages: {
        ...view.botMessages,
        [event.correlationId]: {
          ts: response.ts!,
          createdAt: new Date(),
          status: "REQUESTED",
        },
      },
    });
  }

  private async handleBotResponseAdded(event: BotResponseAdded): Promise<void> {
    const [view, slackService] = await Promise.all([
      this.getOrFailByConversationId(event.conversationId),
      getSlackService(),
    ]);

    const botMessage = view.botMessages[event.correlationId];
    // const messagesToPrecede = Object.entries(view.botMessages).filter(
    //   ([key, message]) =>
    //     message.status === "RESPONDED" && key !== event.correlationId
    // );

    await Promise.all([
      // ...messagesToPrecede.map(([, message]) =>
      //   this.precedeMessage(
      //     slackService,
      //     view.channel,
      //     view.threadId,
      //     message.ts
      //   )
      // ),
      slackService.chat.update({
        ts: botMessage.ts,
        channel: view.channel,
        ...SlackMessageHelpers.updateWithResponse({
          markdownBody: event.message.text,
          botUserId: view.botUserId,
        }),
      }),
    ]);

    await this.repository.update({
      ...view,
      botMessages: {
        ...view.botMessages,
        // ...Object.fromEntries(
        //   messagesToPrecede.map(([key, message]) => [
        //     key,
        //     { ...message, status: "PRECEDED" },
        //   ])
        // ),
        [event.correlationId]: {
          ...botMessage,
          status: "RESPONDED",
        },
      },
    });
  }

  // private async precedeMessage(
  //   slackService: WebClient,
  //   channel: string,
  //   thread_ts: string,
  //   ts: string
  // ): Promise<void> {
  //   // TODO: figure out a way to update without querying history?
  //   const result = await slackService.conversations.replies({
  //     channel,
  //     ts: thread_ts,
  //     latest: ts,
  //     limit: 1,
  //     inclusive: true,
  //   });
  //
  //   const { text, blocks }: any = result.messages?.[1]!;
  //   const previousMessage = { text, blocks };
  //
  //   await slackService.chat.update({
  //     ts,
  //     channel,
  //     ...SlackMessageHelpers.precedeMessage(previousMessage),
  //   });
  // }

  private async getOrFailByConversationId(
    conversationId: string
  ): Promise<SlackConversationView> {
    const view = await this.repository.getByConversationId(conversationId);
    if (!view) {
      throw new Error("expected view to be created already");
    }

    return view;
  }
}
