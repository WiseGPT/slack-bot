import { Message } from "@wisegpt/gpt-conversation-prompt";

export type ConversationMessage = Message & {
  id: string;
};
