import {
  Conversation,
  ConversationCompleteOutput,
  ConversationSummaryOutput,
} from "@wisegpt/gpt-conversation-prompt";
import config from "../../config";
import { getPersonaByConfigName } from "../../domain/persona";
import { Persona } from "../../domain/persona/base-persona/base-persona.dto";
import { ConversationPromptServiceFactory } from "./conversation-prompt-service.factory";

export class OpenAIService {
  constructor(
    private readonly conversationPromptServiceFactory: ConversationPromptServiceFactory = new ConversationPromptServiceFactory(),
    private readonly persona: Persona = getPersonaByConfigName(
      config.conversation.personaConfigName
    )
  ) {}

  async completion(
    conversation: Conversation
  ): Promise<ConversationCompleteOutput> {
    const conversationPromptService =
      await this.conversationPromptServiceFactory.createWithCache();

    return conversationPromptService.completion({
      prompt: {
        conversation: conversation,
        aiPersona: this.persona,
      },
      modelConfiguration: this.persona.modelConfiguration,
    });
  }

  async summary(
    conversation: Conversation
  ): Promise<ConversationSummaryOutput> {
    const conversationPromptService =
      await this.conversationPromptServiceFactory.createWithCache();

    return conversationPromptService.summary({
      prompt: {
        conversation: conversation,
        aiPersona: this.persona,
      },
      modelConfiguration: this.persona.modelConfiguration,
    });
  }
}
