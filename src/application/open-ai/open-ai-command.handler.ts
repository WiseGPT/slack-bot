/**
 * `AICommandHandler` processes completion and summary requests
 * with the given correlation ID, and communicates
 */
import { CommandBus, globalCommandBus } from "../../domain/bus/command-bus";
import {
  ConversationAICommand,
  TriggerCompletionCommand,
} from "../../domain/conversation/ai/conversation-ai.commands";
import { ConversationCommand } from "../../domain/conversation/conversation.commands";
import { OpenAIService } from "../../infrastructure/openai/openai.service";

export class OpenAICommandHandler {
  constructor(
    private readonly conversationCommandBus: CommandBus<ConversationCommand> = globalCommandBus,
    private readonly openAIService: OpenAIService = new OpenAIService()
  ) {}

  async handle(cmd: ConversationAICommand): Promise<void> {
    switch (cmd.type) {
      case "TRIGGER_COMPLETION_COMMAND": {
        return this.executeTriggerCompletion(cmd);
      }
      default:
        throw new Error(`unknown type of command: ${JSON.stringify(cmd)}`);
    }
  }

  private async executeTriggerCompletion(
    cmd: TriggerCompletionCommand
  ): Promise<void> {
    try {
      const { text, usage } = await this.openAIService.completion(cmd.messages);

      await this.conversationCommandBus.send({
        type: "PROCESS_COMPLETION_RESPONSE_COMMAND",
        botResponseType: "BOT_RESPONSE_SUCCESS",
        conversationId: cmd.conversationId,
        correlationId: cmd.correlationId,
        message: text,
        // We rely on the fact that only 1 completion is done, this number could be wrong
        // if we used `best_of` and `n` parameters.
        messageTokens: usage.completionTokens,
        totalTokensSpent: usage.totalTokens,
      });
    } catch (err: any) {
      await this.conversationCommandBus.send({
        type: "PROCESS_COMPLETION_RESPONSE_COMMAND",
        botResponseType: "BOT_RESPONSE_ERROR",
        conversationId: cmd.conversationId,
        correlationId: cmd.correlationId,
        error: {
          message: err.message,
        },
      });
    }
  }
}
