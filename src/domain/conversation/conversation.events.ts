type BaseEvent = {
  eventId: number;
  conversationId: string;
};

export type ConversationStarted = BaseEvent & {
  type: "CONVERSATION_STARTED";
  conversationId: string;
  metadata: Record<string, string>;
};

export type UserMessageAdded = BaseEvent & {
  type: "USER_MESSAGE_ADDED";
  conversationId: string;
  message: {
    id: string;
    text: string;
    author: { id: string };
  };
};

export type ConversationEnded = BaseEvent & {
  type: "CONVERSATION_ENDED";
  conversationId: string;
};

export type BotResponseRequested = BaseEvent & {
  type: "BOT_RESPONSE_REQUESTED";
  conversationId: string;
  correlationId: string;
};

export type BotResponseAdded = BaseEvent & {
  type: "BOT_RESPONSE_ADDED";
  conversationId: string;
  correlationId: string;
  message: {
    id: string;
    text: string;
  };
};

export type ConversationEvent =
  | ConversationStarted
  | UserMessageAdded
  | BotResponseRequested
  | BotResponseAdded
  | ConversationEnded;
