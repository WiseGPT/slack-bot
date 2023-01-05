import { OpenAICommandHandler } from "../../application/open-ai/open-ai-command.handler";
import { ConversationAICommand } from "../../domain/conversation/ai/conversation-ai.commands";
import { AsyncLambda, createHandler } from "./lambda";

class OpenAILambda extends AsyncLambda<ConversationAICommand> {
  constructor(
    private readonly openAICommandHandler: OpenAICommandHandler = new OpenAICommandHandler()
  ) {
    super({ lambdaName: "OpenAILambda" });
  }

  async handle(cmd: ConversationAICommand): Promise<void> {
    await this.openAICommandHandler.handle(cmd);
  }
}

export const handler = createHandler(new OpenAILambda());
