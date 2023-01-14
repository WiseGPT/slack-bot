import { ConversationAIService } from "./ai/conversation-ai.service";
import {
  AddUserMessageCommand,
  ProcessCompletionResponseCommand,
  ProcessSummaryResponseCommand,
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
import config from "../../config";

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

  private lastSummary: { summary: string; lastMessageId: string } | undefined;
  private messagesSinceLastSummary: ConversationMessage[];
  private totalTokensSinceLastSummary: number;

  private aiStatus: ConversationAIStatus;

  private totalTokensSpent: number;

  private newEvents: ConversationEvent[] = [];

  private constructor(
    public readonly conversationId: string,
    createEvent?: Omit<ConversationStarted, "eventId">
  ) {
    this.nextEventId = 0;
    this.status = { status: "ONGOING" };

    this.messagesSinceLastSummary = [];
    this.totalTokensSinceLastSummary = 0;

    this.aiStatus = {
      completion: { status: "IDLE" },
      summary: { status: "IDLE" },
    };
    this.totalTokensSpent = 0;

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

  async addUserMessage(
    { message }: AddUserMessageCommand,
    conversationAIService: ConversationAIService
  ): Promise<void> {
    this.assertConversationOngoing();

    this.createAndApply({
      type: "USER_MESSAGE_ADDED",
      conversationId: this.conversationId,
      message: {
        ...message,
        approximateTokens: gpt3TokenCount(message.text),
      },
    });

    await this.triggerCompletionIfNecessary(conversationAIService);
  }

  async processCompletionResponse(
    cmd: ProcessCompletionResponseCommand,
    conversationAIService: ConversationAIService
  ): Promise<void> {
    this.assertConversationOngoing();

    const aiCompletionStatus = this.aiStatus.completion;

    if (aiCompletionStatus.status !== "PROCESSING") {
      throw new Error("expected AI Completion status to be Processing");
    }

    if (aiCompletionStatus.correlationId !== cmd.correlationId) {
      throw new Error(
        `unknown bot response, expected response for correlation id '${aiCompletionStatus.correlationId}' but got '${cmd.correlationId}'`
      );
    }

    switch (cmd.responseType) {
      case "BOT_COMPLETION_SUCCESS": {
        this.createAndApply({
          type: "BOT_RESPONSE_ADDED",
          conversationId: this.conversationId,
          correlationId: cmd.correlationId,
          message: {
            id: cmd.correlationId,
            text: cmd.message,
            tokens: cmd.messageTokens,
          },
          totalTokensSpent: cmd.totalTokensSpent,
        });

        if (!this.endConversationIfWentOverLimit()) {
          if (
            !(await this.triggerSummarizationIfNecessary(conversationAIService))
          ) {
            // TODO: fix completion is not triggering because bot response may get added after user message (timing issue)
            // we should use message time instead of event id to order messages
            await this.triggerCompletionIfNecessary(conversationAIService);
          }
        }

        return;
      }
      case "BOT_COMPLETION_ERROR": {
        return this.createAndApply({
          type: "CONVERSATION_ENDED",
          conversationId: this.conversationId,
          reason: {
            type: "BOT_COMPLETION_ERROR",
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

  async processSummaryResponse(
    cmd: ProcessSummaryResponseCommand,
    conversationAIService: ConversationAIService
  ): Promise<void> {
    this.assertConversationOngoing();

    const aiSummaryStatus = this.aiStatus.summary;

    if (aiSummaryStatus.status !== "PROCESSING") {
      throw new Error("expected AI Summary status to be Processing");
    }

    if (aiSummaryStatus.correlationId !== cmd.correlationId) {
      throw new Error(
        `unknown bot response, expected response for correlation id '${aiSummaryStatus.correlationId}' but got '${cmd.correlationId}'`
      );
    }

    switch (cmd.responseType) {
      case "BOT_SUMMARY_SUCCESS": {
        this.createAndApply({
          type: "BOT_SUMMARY_ADDED",
          conversationId: this.conversationId,
          correlationId: cmd.correlationId,
          summary: cmd.summary,
          summaryTokens: cmd.summaryTokens,
          totalTokensSpent: cmd.totalTokensSpent,
        });

        if (!this.endConversationIfWentOverLimit()) {
          await this.triggerCompletionIfNecessary(conversationAIService);

          return;
        }

        return;
      }
      case "BOT_SUMMARY_ERROR": {
        return this.createAndApply({
          type: "CONVERSATION_ENDED",
          conversationId: this.conversationId,
          reason: {
            type: "BOT_SUMMARY_ERROR",
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

  private endConversationIfWentOverLimit(): boolean {
    if (this.totalTokensSpent > config.conversation.maximumSpentTokens) {
      this.createAndApply({
        type: "CONVERSATION_ENDED",
        conversationId: this.conversationId,
        reason: {
          type: "MAXIMUM_CONVERSATION_TOKENS_REACHED",
          maximumSpentTokens: config.conversation.maximumSpentTokens,
          totalTokensSpent: this.totalTokensSpent,
        },
      });

      return true;
    }

    return false;
  }

  private async triggerSummarizationIfNecessary(
    conversationAIService: ConversationAIService
  ): Promise<boolean> {
    // make sure there is no completion or summarization going on
    if (this.isConversationAIWorking()) {
      return false;
    }

    const { minimumTokens, minimumUserMessages } =
      config.conversation.summarization;
    const messageCountSinceLastSummary = this.messagesSinceLastSummary.filter(
      ({ author }) => author.type !== "BOT"
    ).length;

    if (
      this.totalTokensSinceLastSummary >= minimumTokens &&
      messageCountSinceLastSummary > Math.max(1, minimumUserMessages)
    ) {
      const { correlationId } = await conversationAIService.trigger({
        type: "TRIGGER_SUMMARY_COMMAND",
        conversationId: this.conversationId,
        conversation: {
          summary: this.lastSummary?.summary,
          messages: this.messagesSinceLastSummary,
        },
      });

      this.createAndApply({
        type: "BOT_SUMMARY_REQUESTED",
        conversationId: this.conversationId,
        correlationId,
        lastMessageId:
          this.messagesSinceLastSummary[
            this.messagesSinceLastSummary.length - 1
          ].id,
      });

      return true;
    }

    return false;
  }

  private async triggerCompletionIfNecessary(
    conversationAIService: ConversationAIService
  ) {
    if (
      // make sure there is no completion or summarization going already
      this.isConversationAIWorking() ||
      // make sure the last message belongs to a user
      this.messagesSinceLastSummary[this.messagesSinceLastSummary.length - 1]
        ?.author.type !== "USER"
    ) {
      return;
    }

    const { correlationId } = await conversationAIService.trigger({
      type: "TRIGGER_COMPLETION_COMMAND",
      conversationId: this.conversationId,
      conversation: {
        summary: this.lastSummary?.summary,
        messages: this.messagesSinceLastSummary,
      },
    });

    this.createAndApply({
      type: "BOT_COMPLETION_REQUESTED",
      conversationId: this.conversationId,
      correlationId,
    });
  }

  private isConversationAIWorking(): boolean {
    return (
      this.aiStatus.completion.status === "PROCESSING" ||
      this.aiStatus.summary.status === "PROCESSING"
    );
  }

  private addConversationMessage({
    message,
    tokens,
  }: {
    message: ConversationMessage;
    tokens: number;
  }): void {
    this.messagesSinceLastSummary.push(message);
    this.totalTokensSinceLastSummary += tokens;
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
      case "BOT_COMPLETION_REQUESTED": {
        this.aiStatus = {
          ...this.aiStatus,
          completion: {
            status: "PROCESSING",
            correlationId: event.correlationId,
          },
        };

        return;
      }
      case "BOT_RESPONSE_ADDED": {
        this.aiStatus = { ...this.aiStatus, completion: { status: "IDLE" } };
        this.totalTokensSpent += event.totalTokensSpent;

        return this.addConversationMessage({
          message: {
            id: event.message.id,
            text: event.message.text,
            author: { type: "BOT" },
          },
          tokens: event.message.tokens,
        });
      }
      case "BOT_SUMMARY_REQUESTED": {
        this.aiStatus = {
          ...this.aiStatus,
          summary: {
            status: "PROCESSING",
            correlationId: event.correlationId,
            lastMessageId: event.lastMessageId,
          },
        };

        return;
      }
      case "BOT_SUMMARY_ADDED": {
        if (this.aiStatus.summary.status === "IDLE") {
          throw new Error("can not add summary when not asked for");
        }

        const { lastMessageId } = this.aiStatus.summary;

        this.aiStatus = {
          ...this.aiStatus,
          summary: { status: "IDLE" },
        };

        this.totalTokensSpent += event.totalTokensSpent;

        this.lastSummary = { summary: event.summary, lastMessageId };

        // remove all messages up until the summarization
        const index = this.messagesSinceLastSummary.findIndex(
          ({ id }) => id === lastMessageId
        );
        this.messagesSinceLastSummary = this.messagesSinceLastSummary.slice(
          index + 1
        );

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
      case "BOT_COMPLETION_ERROR": {
        this.status = {
          status: "ERROR",
          message: `bot response error: ${event.reason.error.message}`,
        };

        this.aiStatus = { ...this.aiStatus, completion: { status: "IDLE" } };

        return;
      }
      case "BOT_SUMMARY_ERROR": {
        this.status = {
          status: "ERROR",
          message: `bot summary error: ${event.reason.error.message}`,
        };

        this.aiStatus = { ...this.aiStatus, summary: { status: "IDLE" } };

        return;
      }
    }
  }
}
