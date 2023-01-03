import { ConversationPromptService } from "@wisegpt/gpt-conversation-prompt";
import { Configuration, OpenAIApi } from "openai";
import config from "../../config";
import { ConversationMessage } from "../../domain/conversation/conversation.dto";
import { getPersonaByConfigName } from "../../domain/persona";
import { Persona } from "../../domain/persona/base-persona/base-persona.dto";
import { OpenAiSecretsService } from "../secrets/open-ai-secrets.service";

export class OpenAIService {
  constructor(
    private readonly openAiSecretsService = new OpenAiSecretsService(),
    private readonly persona: Persona = getPersonaByConfigName(
      config.conversation.personaConfigName
    )
  ) {}

  async askForResponse(messages: ConversationMessage[]) {
    const { apiKey } = await this.openAiSecretsService.retrieve();
    const openAIApi = new OpenAIApi(new Configuration({ apiKey }));
    const conversationPromptService = new ConversationPromptService(openAIApi);

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
