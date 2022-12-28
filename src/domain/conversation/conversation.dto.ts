export const BOT_USER_ID = "wisegpt";
export const BOT_NAME = "WiseGPT";

export type User = {
  userId: string;
};

export type Message = {
  author: User;
  id: string;
  text: string;
};

export type AIStatus =
  | {
      status: "IDLE";
    }
  | { status: "PROCESSING"; correlationId: string };

export type AddUserMessageCommand = {
  type: "ADD_USER_MESSAGE_COMMAND";
  conversationId: string;
  message: Message;
};

export type CreateConversationCommand = {
  type: "CREATE_CONVERSATION_COMMAND";
  conversationId: string;
  initialMessage: Message;
  metadata: Record<string, string>;
};

export type ConversationCommand =
  | AddUserMessageCommand
  | CreateConversationCommand;

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
  message: Message;
};

export type ConversationEvent =
  | ConversationStarted
  | UserMessageAdded
  | BotResponseRequested
  | BotResponseAdded
  | ConversationEnded;
