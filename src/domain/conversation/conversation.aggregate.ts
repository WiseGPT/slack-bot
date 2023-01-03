import { AddUserMessageCommand } from "./conversation.commands";
import { ConversationMessage } from "./conversation.dto";
import { ConversationEvent, ConversationStarted } from "./conversation.events";
import { BotResponse, TriggerBotService } from "./trigger-bot.service";

type DistributiveOmit<T, K extends keyof any> = T extends any
  ? Omit<T, K>
  : never;

type AIStatus =
  | {
      status: "IDLE";
    }
  | { status: "PROCESSING"; correlationId: string };

function assertUnreachable(value: never): never {
  throw new Error(`expected value to be unreachable: '${value}'`);
}

export class ConversationAggregate {
  static create(
    conversationId: string,
    metadata: Record<string, string>
  ): ConversationAggregate {
    return new ConversationAggregate(conversationId, {
      type: "CONVERSATION_STARTED",
      conversationId,
      metadata: metadata,
    });
  }

  static load(conversationId: string): ConversationAggregate {
    return new ConversationAggregate(conversationId);
  }

  private nextEventId: number;
  private messages: ConversationMessage[];
  private aiStatus: AIStatus;

  private newEvents: ConversationEvent[] = [];

  private constructor(
    public readonly conversationId: string,
    createEvent?: Omit<ConversationStarted, "eventId">
  ) {
    this.nextEventId = 0;
    this.messages = [];
    this.aiStatus = { status: "IDLE" };

    if (createEvent) {
      this.createAndApply(createEvent);
    }
  }

  /**
   * Returns the recently appended events to the aggregate since the last load
   */
  get events(): ConversationEvent[] {
    return this.newEvents;
  }

  addUserMessage({ message }: AddUserMessageCommand) {
    this.createAndApply({
      type: "USER_MESSAGE_ADDED",
      conversationId: this.conversationId,
      message,
    });
  }

  reactToUserMessage(
    correlationId: string,
    triggerBotService: TriggerBotService
  ) {
    if (this.aiStatus.status !== "IDLE") {
      return;
    }

    triggerBotService.trigger(this.messages);

    this.createAndApply({
      type: "BOT_RESPONSE_REQUESTED",
      conversationId: this.conversationId,
      correlationId,
    });
  }

  addBotResponse(botResponse: BotResponse): void {
    if (this.aiStatus.status !== "PROCESSING") {
      throw new Error("expected AI status to be Processing");
    }

    if (this.aiStatus.correlationId !== botResponse.correlationId) {
      throw new Error(
        `unknown bot response, expected response for correlation id '${this.aiStatus.correlationId}' but got '${botResponse.correlationId}'`
      );
    }

    const messageId = botResponse.correlationId;

    switch (botResponse.type) {
      case "BOT_RESPONSE_SUCCESS": {
        const message: ConversationMessage = {
          id: messageId,
          author: { type: "BOT" },
          text: botResponse.message,
        };

        this.createAndApply({
          type: "BOT_RESPONSE_ADDED",
          conversationId: this.conversationId,
          correlationId: botResponse.correlationId,
          message,
        });

        return;
      }
      case "BOT_RESPONSE_ERROR": {
        const message: ConversationMessage = {
          id: messageId,
          author: { type: "BOT" },
          text: `unexpected error occurred: ${botResponse.error.message}`,
        };

        this.createAndApply({
          type: "BOT_RESPONSE_ADDED",
          conversationId: this.conversationId,
          correlationId: botResponse.correlationId,
          message,
        });

        return;
      }
      default:
        return assertUnreachable(botResponse);
    }
  }

  public apply(event: ConversationEvent): void {
    return this.pApply(event, { stale: true });
  }

  private createAndApply(
    event: DistributiveOmit<ConversationEvent, "eventId">
  ): void {
    return this.pApply(
      {
        eventId: this.nextEventId,
        ...event,
      } as ConversationEvent,
      { stale: false }
    );
  }

  private pApply(
    event: ConversationEvent,
    { stale }: { stale: boolean }
  ): void {
    if (event.eventId !== this.nextEventId) {
      throw new Error("events tried to be replayed out of order");
    }

    this.nextEventId += 1;

    if (!stale) {
      this.newEvents.push(event);
    }

    switch (event.type) {
      case "BOT_RESPONSE_ADDED": {
        this.aiStatus = { status: "IDLE" };

        this.messages.push({
          id: event.message.id,
          text: event.message.text,
          author: { type: "BOT" },
        });

        return;
      }
      case "USER_MESSAGE_ADDED":
        this.messages.push({
          id: event.message.id,
          text: event.message.text,
          author: { type: "USER", id: event.message.author.id },
        });

        return;
      case "BOT_RESPONSE_REQUESTED": {
        this.aiStatus = {
          status: "PROCESSING",
          correlationId: event.correlationId,
        };

        return;
      }
    }
  }
}
