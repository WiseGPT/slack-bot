import { ConversationAICommand } from "./conversation-ai.commands";

export interface ConversationAIService {
  trigger(
    cmd: Omit<ConversationAICommand, "correlationId">
  ): Promise<{ correlationId: string }>;
}
