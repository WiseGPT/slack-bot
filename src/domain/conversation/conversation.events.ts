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

export type BotResponseRequested = BaseEvent & {
  type: "BOT_RESPONSE_REQUESTED";
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
};

export type ConversationEnded = BaseEvent & {
  type: "CONVERSATION_ENDED";
  reason:
    | {
        type: "MAXIMUM_CONVERSATION_TOKENS_REACHED";
        maxConversationTokens: number;
        totalTokens: number;
      }
    | {
        type: "BOT_RESPONSE_ERROR";
        correlationId: string;
        error: { message: string };
      };
};

export type ConversationEvent =
  | ConversationStarted
  | UserMessageAdded
  | BotResponseRequested
  | BotResponseAdded
  | ConversationEnded;
