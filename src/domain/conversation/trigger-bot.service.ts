import { ConversationMessage } from "./conversation.dto";

export type BotResponse =
  | {
      type: "BOT_RESPONSE_SUCCESS";
      correlationId: string;
      message: string;
    }
  | { type: "BOT_RESPONSE_ERROR"; correlationId: string; error: Error };

export interface TriggerBotService {
  trigger(messages: ConversationMessage[]): void;
}
