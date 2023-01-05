import { ConversationAICommand } from "./conversation-ai.commands";

export interface ConversationAIService {
  trigger(cmd: ConversationAICommand): Promise<void>;
}
