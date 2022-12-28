import {
  AddUserMessageCommand,
  AIStatus,
  BOT_USER_ID,
  ConversationEvent,
  Message,
} from "./conversation.dto";
import { BotResponse, TriggerBotService } from "./trigger-bot.service";
import { DomainEvent } from "../bus/event-bus";

function assertUnreachable(value: never): never {
  throw new Error(`expected value to be unreachable: '${value}'`);
}

export class ConversationAggregate {
  constructor(
    public readonly conversationId: string,
    public status: "ONGOING" | "COMPLETED",
    public readonly messages: Message[],
    public aiStatus: AIStatus,
    private newEvents: ConversationEvent[] = []
  ) {}

  static createConversation(
    conversationId: string,
    metadata: Record<string, string>
  ): ConversationAggregate {
    return new ConversationAggregate(
      conversationId,
      "ONGOING",
      [],
      {
        status: "IDLE",
      },
      [{ type: "CONVERSATION_STARTED", conversationId, metadata: metadata }]
    );
  }

  /**
   * Returns the recently appended events to the aggregate since the last load
   */
  get events(): ConversationEvent[] {
    return this.newEvents;
  }

  addUserMessage({ message }: AddUserMessageCommand) {
    this.messages.push(message);

    this.apply({
      type: "USER_MESSAGE_ADDED",
      conversationId: this.conversationId,
      authorUserId: message.author.userId,
      messageId: message.id,
    });
  }

  reactToUserMessage(
    correlationId: string,
    triggerBotService: TriggerBotService
  ) {
    if (this.aiStatus.status !== "IDLE" || this.status !== "ONGOING") {
      return;
    }

    triggerBotService.trigger(this.messages);

    this.aiStatus = { status: "PROCESSING", correlationId };

    this.apply({
      type: "BOT_RESPONSE_REQUESTED",
      conversationId: this.conversationId,
      correlationId,
    });
  }

  addBotResponse(botResponse: BotResponse) {
    if (this.aiStatus.status !== "PROCESSING") {
      throw new Error("expected AI status to be Processing");
    }

    if (this.aiStatus.correlationId !== botResponse.correlationId) {
      throw new Error(
        `unknown bot response, expected response for correlation id '${this.aiStatus.correlationId}' but got '${botResponse.correlationId}'`
      );
    }

    const messageId = botResponse.correlationId;
    this.aiStatus = { status: "IDLE" };

    switch (botResponse.type) {
      case "BOT_RESPONSE_SUCCESS": {
        const message: Message = {
          id: messageId,
          author: { userId: BOT_USER_ID },
          text: botResponse.message,
        };

        this.messages.push(message);

        this.apply({
          type: "BOT_RESPONSE_ADDED",
          conversationId: this.conversationId,
          correlationId: botResponse.correlationId,
          message,
        });

        return;
      }
      case "BOT_RESPONSE_ERROR": {
        const message: Message = {
          id: messageId,
          author: { userId: BOT_USER_ID },
          text: `unexpected error occurred: ${botResponse.error}`,
        };

        this.messages.push(message);

        this.apply({
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

  endConversation() {
    this.status = "COMPLETED";

    this.apply({
      type: "CONVERSATION_ENDED",
      conversationId: this.conversationId,
    });
  }

  private apply(event: DomainEvent) {
    this.newEvents.push(event);
  }
}
