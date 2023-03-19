import {
  Conversation,
  ConversationCompleteOutput,
  ConversationSummaryOutput,
} from "@wisegpt/gpt-conversation-prompt";
import { ConversationPromptServiceFactory } from "./conversation-prompt-service.factory";
import config from "../../config";
import { getPersonaByConfigName } from "../../domain/persona";
import { Persona } from "../../domain/persona/base-persona/base-persona.dto";

export class OpenAIService {
  constructor(
    private readonly conversationPromptServiceFactory: ConversationPromptServiceFactory = new ConversationPromptServiceFactory(),
    private readonly persona: Persona = getPersonaByConfigName(
      config.conversation.personaConfigName
    )
  ) {}

  async chatCompletion(
    conversation: Conversation
  ): Promise<ConversationCompleteOutput> {
    const conversationPromptService =
      await this.conversationPromptServiceFactory.createWithCache();

    return conversationPromptService.chatCompletion({
      prompt: {
        conversation: conversation,
        aiPersona: this.persona,
      },
      modelConfiguration: this.persona.chatModelConfiguration,
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
      modelConfiguration: this.persona.summaryModelConfiguration,
    });
  }
}
