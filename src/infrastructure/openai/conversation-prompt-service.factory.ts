import { ConversationPromptService } from "@wisegpt/gpt-conversation-prompt";
import { Configuration, OpenAIApi } from "openai";
import { OpenAiSecretsService } from "../secrets/open-ai-secrets.service";

export class ConversationPromptServiceFactory {
  private cache:
    | { apiKey: string; service: ConversationPromptService }
    | undefined = undefined;

  constructor(
    private readonly openAiSecretsService = new OpenAiSecretsService()
  ) {}

  async createWithCache(): Promise<ConversationPromptService> {
    const { apiKey } = await this.openAiSecretsService.retrieve();

    if (this.cache?.apiKey === apiKey) {
      return this.cache.service;
    }

    const api = new OpenAIApi(new Configuration({ apiKey }));
    const service = new ConversationPromptService(api);

    this.cache = { apiKey, service };

    return service;
  }
}
