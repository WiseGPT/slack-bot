import { ConversationPromptService } from "@wisegpt/gpt-conversation-prompt";
import { Configuration, OpenAIApi } from "openai";
import config from "../../config";
import {
  BOT_USER_ID,
  Message,
} from "../../domain/conversation/conversation.dto";
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

  async askForResponse(messages: Message[]) {
    const { apiKey } = await this.openAiSecretsService.retrieve();
    const openAIApi = new OpenAIApi(new Configuration({ apiKey }));
    const conversationPromptService = new ConversationPromptService(openAIApi);

    return conversationPromptService.conversationCompletion({
      prompt: {
        conversation: {
          messages: messages.map(({ text, author }) => ({
            text,
            author:
              author.userId === BOT_USER_ID
                ? { type: "BOT" }
                : { type: "USER", id: author.userId },
          })),
        },
        aiPersona: this.persona,
      },
      modelConfiguration: this.persona.modelConfiguration,
    });
  }
}
