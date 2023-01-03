import { ConversationMessage } from "./conversation.dto";

export type ConversationStarted = {
  type: "CONVERSATION_STARTED";
  conversationId: string;
  metadata: Record<string, string>;
};

export type UserMessageAdded = {
  type: "USER_MESSAGE_ADDED";
  conversationId: string;
  authorUserId: string;
  messageId: string;
};

export type ConversationEnded = {
  type: "CONVERSATION_ENDED";
  conversationId: string;
};

export type BotResponseRequested = {
  type: "BOT_RESPONSE_REQUESTED";
  conversationId: string;
  correlationId: string;
};

export type BotResponseAdded = {
  type: "BOT_RESPONSE_ADDED";
  conversationId: string;
  correlationId: string;
  message: ConversationMessage;
};

export type ConversationEvent =
  | ConversationStarted
  | UserMessageAdded
  | BotResponseRequested
  | BotResponseAdded
  | ConversationEnded;
