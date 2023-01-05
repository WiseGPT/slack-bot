import config from "../../config";
import { ConversationAIService } from "./ai/conversation-ai.service";
import {
  AddUserMessageCommand,
  ProcessCompletionResponseCommand,
} from "./conversation.commands";
import {
  ConversationAIStatus,
  ConversationMessage,
  ConversationStatus,
  DistributiveOmit,
} from "./conversation.dto";
import {
  ConversationEnded,
  ConversationEvent,
  ConversationStarted,
} from "./conversation.events";
import { gpt3TokenCount } from "./gpt3-token-count";

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
  private status: ConversationStatus;
  private readonly messages: ConversationMessage[];
  private aiStatus: ConversationAIStatus;
  private totalTokens: number;

  private newEvents: ConversationEvent[] = [];

  private constructor(
    public readonly conversationId: string,
    createEvent?: Omit<ConversationStarted, "eventId">
  ) {
    this.nextEventId = 0;
    this.status = { status: "ONGOING" };
    this.messages = [];
    this.aiStatus = { status: "IDLE" };
    this.totalTokens = 0;

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
    this.assertConversationOngoing();

    this.createAndApply({
      type: "USER_MESSAGE_ADDED",
      conversationId: this.conversationId,
      message: {
        ...message,
        approximateTokens: gpt3TokenCount(message.text),
      },
    });
  }

  async reactToUserMessage(
    correlationId: string,
    conversationAIService: ConversationAIService
  ): Promise<void> {
    this.assertConversationOngoing();

    if (this.aiStatus.status !== "IDLE") {
      return;
    }

    if (this.totalTokens > config.conversation.maxConversationTokens) {
      this.createAndApply({
        type: "CONVERSATION_ENDED",
        conversationId: this.conversationId,
        reason: {
          type: "MAXIMUM_CONVERSATION_TOKENS_REACHED",
          maxConversationTokens: config.conversation.maxConversationTokens,
          totalTokens: this.totalTokens,
        },
      });
    } else {
      await conversationAIService.trigger({
        type: "TRIGGER_COMPLETION_COMMAND",
        conversationId: this.conversationId,
        correlationId: correlationId,
        messages: this.messages,
      });

      this.createAndApply({
        type: "BOT_RESPONSE_REQUESTED",
        conversationId: this.conversationId,
        correlationId,
      });
    }
  }

  processCompletionResponse(cmd: ProcessCompletionResponseCommand): void {
    this.assertConversationOngoing();

    if (this.aiStatus.status !== "PROCESSING") {
      throw new Error("expected AI status to be Processing");
    }

    if (this.aiStatus.correlationId !== cmd.correlationId) {
      throw new Error(
        `unknown bot response, expected response for correlation id '${this.aiStatus.correlationId}' but got '${cmd.correlationId}'`
      );
    }

    switch (cmd.botResponseType) {
      case "BOT_RESPONSE_SUCCESS": {
        return this.createAndApply({
          type: "BOT_RESPONSE_ADDED",
          conversationId: this.conversationId,
          correlationId: cmd.correlationId,
          message: {
            id: cmd.correlationId,
            text: cmd.message,
            tokens: cmd.tokens,
          },
        });
      }
      case "BOT_RESPONSE_ERROR": {
        return this.createAndApply({
          type: "CONVERSATION_ENDED",
          conversationId: this.conversationId,
          reason: {
            type: "BOT_RESPONSE_ERROR",
            correlationId: cmd.correlationId,
            error: {
              message: cmd.error.message,
            },
          },
        });
      }
      default:
        throw new Error(
          `unknown type of bot response: '${JSON.stringify(cmd)}'`
        );
    }
  }

  public apply(event: ConversationEvent): void {
    return this.pApply(event, { stale: true });
  }

  private assertConversationOngoing(): void {
    if (this.status.status !== "ONGOING") {
      throw new Error(
        `conversation is not ongoing. status: '${this.status.status}'`
      );
    }
  }

  private addConversationMessage({
    message,
    tokens,
  }: {
    message: ConversationMessage;
    tokens: number;
  }): void {
    this.messages.push(message);
    this.totalTokens += tokens;
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

        return this.addConversationMessage({
          message: {
            id: event.message.id,
            text: event.message.text,
            author: { type: "BOT" },
          },
          tokens: event.message.tokens,
        });
      }
      case "CONVERSATION_ENDED": {
        return this.applyConversationEnded(event);
      }
      case "USER_MESSAGE_ADDED":
        return this.addConversationMessage({
          message: {
            id: event.message.id,
            text: event.message.text,
            author: { type: "USER", id: event.message.author.id },
          },
          tokens: event.message.approximateTokens,
        });
      case "BOT_RESPONSE_REQUESTED": {
        this.aiStatus = {
          status: "PROCESSING",
          correlationId: event.correlationId,
        };

        return;
      }
    }
  }

  private applyConversationEnded(event: ConversationEnded): void {
    switch (event.reason.type) {
      case "MAXIMUM_CONVERSATION_TOKENS_REACHED": {
        this.status = {
          status: "ENDED",
        };

        return;
      }
      case "BOT_RESPONSE_ERROR": {
        this.status = {
          status: "ERROR",
          message: `bot response error: ${event.reason.error.message}`,
        };

        this.aiStatus = { status: "IDLE" };

        return;
      }
    }
  }
}
