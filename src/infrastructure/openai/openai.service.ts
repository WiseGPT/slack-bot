import { Message } from "../../domain/conversation/conversation.dto";
import { Configuration, OpenAIApi } from "openai";
import { OpenAiSecretsService } from "../secrets/open-ai-secrets.service";
import {
  Persona,
  SEPARATOR_TOKEN,
} from "../../domain/persona/base-persona/base-persona.dto";
import { getPersonaByConfigName } from "../../domain/persona";
import config from "../../config";

type AIResponse = {
  text: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
};

export class OpenAIService {
  constructor(
    private readonly openAiSecretsService = new OpenAiSecretsService(),
    private readonly persona: Persona = getPersonaByConfigName(
      config.conversation.persona
    )
  ) {}

  async askForResponse(messages: Message[]): Promise<AIResponse> {
    const prompt =
      this.persona.basePrompt +
      messages
        .map(
          (message) =>
            `${
              message.author.userId === config.bot.userId
                ? config.bot.name
                : "Human"
            }: ${message.text}`
        )
        .join(` ${SEPARATOR_TOKEN}\n`) +
      `\n${config.bot.name}: `;

    // TODO: take out secret retrieval to outside of this class
    const { apiKey } = await this.openAiSecretsService.retrieve();
    const api = new OpenAIApi(new Configuration({ apiKey }));

    const { data } = await api.createCompletion({
      ...this.persona.baseCompletionRequest,
      prompt,
    });

    const text = data.choices?.[0].text!.trim().replace(SEPARATOR_TOKEN, "");

    const {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: totalTokens,
    } = data.usage!;

    return { text, usage: { promptTokens, completionTokens, totalTokens } };
  }
}
