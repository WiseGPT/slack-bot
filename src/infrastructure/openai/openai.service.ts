import {
  ConversationCompleteOutput,
  Message,
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

  async completion(messages: Message[]): Promise<ConversationCompleteOutput> {
    const conversationPromptService =
      await this.conversationPromptServiceFactory.createWithCache();

    return conversationPromptService.completion({
      prompt: {
        conversation: {
          messages: messages.map(({ text, author }) => ({
            text,
            author,
          })),
        },
        aiPersona: this.persona,
      },
      modelConfiguration: this.persona.modelConfiguration,
    });
  }
}
