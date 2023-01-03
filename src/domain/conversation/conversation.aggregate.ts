import { DomainEvent } from "../bus/event-bus";
import { AddUserMessageCommand } from "./conversation.commands";
import { ConversationMessage } from "./conversation.dto";
import { ConversationEvent } from "./conversation.events";
import { BotResponse, TriggerBotService } from "./trigger-bot.service";

type AIStatus =
  | {
      status: "IDLE";
    }
  | { status: "PROCESSING"; correlationId: string };

function assertUnreachable(value: never): never {
  throw new Error(`expected value to be unreachable: '${value}'`);
}

export class ConversationAggregate {
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

  constructor(
    public readonly conversationId: string,
    public status: "ONGOING" | "COMPLETED",
    public readonly messages: ConversationMessage[],
    public aiStatus: AIStatus,
    private newEvents: ConversationEvent[] = []
  ) {}

  /**
   * Returns the recently appended events to the aggregate since the last load
   */
  get events(): ConversationEvent[] {
    return this.newEvents;
  }

  addUserMessage({ message }: AddUserMessageCommand) {
    this.messages.push({
      id: message.id,
      text: message.text,
      author: { type: "USER", id: message.author.id },
    });

    this.apply({
      type: "USER_MESSAGE_ADDED",
      conversationId: this.conversationId,
      authorUserId: message.author.id,
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
        const message: ConversationMessage = {
          id: messageId,
          author: { type: "BOT" },
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
        const message: ConversationMessage = {
          id: messageId,
          author: { type: "BOT" },
          text: `unexpected error occurred: ${botResponse.error.message}`,
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
