type UserMessage = {
  id: string;
  text: string;
  author: { id: string };
};

type BaseCommand = { conversationId: string };

export type AddUserMessageCommand = BaseCommand & {
  type: "ADD_USER_MESSAGE_COMMAND";
  message: UserMessage;
};

export type CreateConversationCommand = BaseCommand & {
  type: "CREATE_CONVERSATION_COMMAND";
  initialMessage: UserMessage;
  metadata: Record<string, string>;
};

export type ProcessCompletionResponseCommand =
  | (BaseCommand & {
      type: "PROCESS_COMPLETION_RESPONSE_COMMAND";
      botResponseType: "BOT_RESPONSE_SUCCESS";
      correlationId: string;
      message: string;
      // how many tokens is the `message`
      tokens: number;
    })
  | (BaseCommand & {
      type: "PROCESS_COMPLETION_RESPONSE_COMMAND";
      botResponseType: "BOT_RESPONSE_ERROR";
      correlationId: string;
      error: {
        message: string;
      };
    });

export type ConversationCommand =
  | AddUserMessageCommand
  | CreateConversationCommand
  | ProcessCompletionResponseCommand;
