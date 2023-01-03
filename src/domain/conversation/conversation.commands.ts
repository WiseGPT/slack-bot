type UserMessage = {
  id: string;
  text: string;
  author: { id: string };
};

export type AddUserMessageCommand = {
  type: "ADD_USER_MESSAGE_COMMAND";
  conversationId: string;
  message: UserMessage;
};

export type CreateConversationCommand = {
  type: "CREATE_CONVERSATION_COMMAND";
  conversationId: string;
  initialMessage: UserMessage;
  metadata: Record<string, string>;
};

export type ConversationCommand =
  | AddUserMessageCommand
  | CreateConversationCommand;
