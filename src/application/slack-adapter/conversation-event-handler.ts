import { WebClient } from "@slack/web-api";
import {
  BotResponseAdded,
  BotCompletionRequested,
  ConversationEnded,
  ConversationEvent,
  ConversationStarted,
} from "../../domain/conversation/conversation.events";
import { SlackConversationView } from "../../domain/slack-adapter/slack-adapter.dto";
import { SlackConversationDynamodbRepository } from "../../infrastructure/dynamodb/slack/slack-conversation-dynamodb.repository";
import { SlackMessageHelpers } from "../../infrastructure/slack/slack-message-helpers";
import defaultSlackWebClientFactory, {
  SlackWebClientFactory,
} from "../../infrastructure/slack/slack-web-client-factory";

export class ConversationEventHandler {
  constructor(
    private readonly repository: SlackConversationDynamodbRepository = new SlackConversationDynamodbRepository(),
    private readonly slackWebClientFactory: SlackWebClientFactory = defaultSlackWebClientFactory
  ) {}

  async handle(event: ConversationEvent): Promise<void> {
    switch (event.type) {
      case "CONVERSATION_STARTED":
        return this.handleConversationStarted(event);
      case "BOT_COMPLETION_REQUESTED":
        return this.handleBotCompletionRequested(event);
      case "BOT_RESPONSE_ADDED":
        return this.handleBotResponseAdded(event);
      case "CONVERSATION_ENDED":
        return this.handleConversationEnded(event);
    }
  }

  private async handleConversationStarted(
    event: ConversationStarted
  ): Promise<void> {
    await this.repository.create({
      conversationId: event.conversationId,
      teamId: event.metadata.teamId,
      threadId: event.metadata.threadId,
      channel: event.metadata.channel,
      botUserId: event.metadata.botUserId,
      status: "CREATED",
      createdAt: new Date(),
      botMessages: {},
    });
  }

  private async handleBotCompletionRequested(
    event: BotCompletionRequested
  ): Promise<void> {
    const view = await this.getOrFailByConversationId(event.conversationId);
    const slackService = await this.slackWebClientFactory.create({
      teamId: view.teamId,
    });

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
    const view = await this.getOrFailByConversationId(event.conversationId);
    const slackService = await this.slackWebClientFactory.create({
      teamId: view.teamId,
    });

    await this.completeBotMessage({
      view,
      slackService,
      botResponse: {
        correlationId: event.correlationId,
        message: event.message.text,
      },
    });
  }

  private async handleConversationEnded(
    event: ConversationEnded
  ): Promise<void> {
    const view = await this.getOrFailByConversationId(event.conversationId);
    const slackService = await this.slackWebClientFactory.create({
      teamId: view.teamId,
    });

    const updatedView: SlackConversationView = { ...view, status: "COMPLETED" };

    await this.repository.update(updatedView);

    if (event.reason.type === "BOT_COMPLETION_ERROR") {
      await this.completeBotMessage({
        view: updatedView,
        slackService,
        botResponse: {
          correlationId: event.reason.correlationId,
          message: event.reason.error.message,
        },
      });
    }

    await slackService.chat.postMessage({
      thread_ts: view.threadId,
      channel: view.channel,
      ...SlackMessageHelpers.createConversationEndedMessage(event),
    });
  }

  private async completeBotMessage({
    view,
    slackService,
    botResponse,
  }: {
    view: SlackConversationView;
    slackService: WebClient;
    botResponse: {
      correlationId: string;
      message: string;
    };
  }): Promise<void> {
    const botMessage = view.botMessages[botResponse.correlationId];
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
          markdownBody: botResponse.message,
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
        [botResponse.correlationId]: {
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
