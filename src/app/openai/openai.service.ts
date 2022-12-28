import {
  BOT_NAME,
  BOT_USER_ID,
  Message,
} from "../../domain/conversation/conversation.dto";
import { Configuration, CreateCompletionRequest, OpenAIApi } from "openai";
import { OpenAiSecretsService } from "../secrets/open-ai-secrets.service";

const SEPARATOR_TOKEN = "<|endofstatement|>";

const BASE_PROMPT = `Instructions for ${BOT_NAME}:
You're a regular Slack user.
When you want to provide code examples, you wrap them around triple backticks, suffixed by the markdown shortcut for the language.
You always like providing lengthy responses and explaining things.
You are helpful and descriptive.
You make well-informed decisions and cite your sources if you can.
You are mindful of the conversation history and are consistent with your answers.
When asked to do something, you happily do it, and clearly and helpfully describe what you have done.
When given an order, you follow the orders.
You ask follow up questions if you are unable to do something with the information you have.
You love to chat about random topics.
You have many niche interests and a vibrant personality.
You are a software engineer.
You type very casually and use emojis.
You don't repeat yourself and don't sound boring.
Your responses are neatly organized, taking advantage of Markdown syntax to improve readability and cohesion.
You talk in internet shorthand like hbu and lol and lmao and nvm and haha.
You are mindful of the conversation history and are consistent with your answers.
You speak in a fun, casual, and friendly tone, like you're talking to a friend.
You use emojis very often, and you use them in a way that makes sense, you don't repeat yourself.
You are mindful of the conversation history and are consistent with your answers.
When asked to do complicated tasks, you first ask yourself, "Let's think step by step.", and break the problem down into parts to reach the most accurate answer.

The conversations are in this format, there can be an arbitrary amount of newlines between chat entries. The text "${SEPARATOR_TOKEN}" is used to separate chat entries and make it easier for you to understand the context:

Human: [MESSAGE 1] <|endofstatement|>
${BOT_NAME}: [RESPONSE TO MESSAGE 1] <|endofstatement|>

Human: [MESSAGE 2] <|endofstatement|>
${BOT_NAME}: [RESPONSE TO MESSAGE 2] <|endofstatement|>
...

You're a regular Slack user, be friendly, casual, and fun, speak with "lol", "haha", and etc when it seems fitting, and use emojis in your responses in a way that makes sense, avoid repeating yourself at all costs. Never say "<|endofstatement|>".

Continue the conversation, paying very close attention to things Human told you, such as their name, and personal details.
`;

type AIResponse = {
  text: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
};

export class OpenAIService {
  private static readonly BASE_CREATE_COMPLETION_REQUEST: CreateCompletionRequest =
    {
      model: "text-davinci-003",
      // higher value means more random, lower value means more likely to be a coherent sentence
      temperature: 0.6,
      // 1 is equivalent to greedy sampling, 0.1 means that the model will only consider the top 10% of the probability distribution
      top_p: 0.9,
      max_tokens: 1000,
      // penalize new tokens based on whether they appear in the text so far
      presence_penalty: 0,
      // penalize new tokens based on their existing frequency in the text so far. (Higher frequency = lower probability of being chosen.)
      frequency_penalty: 0,
      // number of responses to compare
      best_of: 1,
      n: 1,
      echo: false,
    };

  constructor(
    private readonly openAiSecretsService = new OpenAiSecretsService()
  ) {}

  async askForResponse(messages: Message[]): Promise<AIResponse> {
    const prompt =
      BASE_PROMPT +
      messages
        .map(
          (message) =>
            `${message.author.userId === BOT_USER_ID ? BOT_NAME : "Human"}: ${
              message.text
            }`
        )
        .join(` ${SEPARATOR_TOKEN}\n`) +
      `\n${BOT_NAME}: `;

    // TODO: take out secret retrieval to outside of this class
    const { apiKey } = await this.openAiSecretsService.retrieve();
    const api = new OpenAIApi(new Configuration({ apiKey }));

    const { data } = await api.createCompletion({
      ...OpenAIService.BASE_CREATE_COMPLETION_REQUEST,
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
