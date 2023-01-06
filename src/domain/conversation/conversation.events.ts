type BaseEvent = {
  eventId: number;
  conversationId: string;
};

export type ConversationStarted = BaseEvent & {
  type: "CONVERSATION_STARTED";
  metadata: Record<string, string>;
};

export type UserMessageAdded = BaseEvent & {
  type: "USER_MESSAGE_ADDED";
  message: {
    id: string;
    text: string;
    author: { id: string };
    approximateTokens: number;
  };
};

export type BotCompletionRequested = BaseEvent & {
  type: "BOT_COMPLETION_REQUESTED";
  correlationId: string;
};

export type BotResponseAdded = BaseEvent & {
  type: "BOT_RESPONSE_ADDED";
  correlationId: string;
  message: {
    id: string;
    text: string;
    tokens: number;
  };
  totalTokensSpent: number;
};

export type BotSummaryRequested = BaseEvent & {
  type: "BOT_SUMMARY_REQUESTED";
  correlationId: string;
  lastMessageId: string;
};

export type BotSummaryAdded = BaseEvent & {
  type: "BOT_SUMMARY_ADDED";
  correlationId: string;
  summary: string;
  summaryTokens: number;
  totalTokensSpent: number;
};

export type ConversationEnded = BaseEvent & {
  type: "CONVERSATION_ENDED";
  reason:
    | {
        type: "MAXIMUM_CONVERSATION_TOKENS_REACHED";
        maximumSpentTokens: number;
        totalTokensSpent: number;
      }
    | {
        type: "BOT_COMPLETION_ERROR";
        correlationId: string;
        error: { message: string };
      }
    | {
        type: "BOT_SUMMARY_ERROR";
        correlationId: string;
        error: { message: string };
      };
};

export type ConversationEvent =
  | ConversationStarted
  | UserMessageAdded
  | BotCompletionRequested
  | BotResponseAdded
  | BotSummaryRequested
  | BotSummaryAdded
  | ConversationEnded;
