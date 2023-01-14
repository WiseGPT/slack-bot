import { AsyncLambda, createHandler } from "./lambda";
import { OpenAICommandHandler } from "../../application/open-ai/open-ai-command.handler";
import { ConversationAICommand } from "../../domain/conversation/ai/conversation-ai.commands";

class OpenAILambda extends AsyncLambda<ConversationAICommand> {
  constructor(
    private readonly openAICommandHandler: OpenAICommandHandler = new OpenAICommandHandler()
  ) {
    super({ lambdaName: "OpenAILambda" });
  }

  async handle(cmd: ConversationAICommand): Promise<void> {
    try {
      // TODO: make debug logging better and count usage with proper metrics
      console.log(
        JSON.stringify({
          cmd: {
            conversation: {
              summarySize: cmd.conversation.summary?.length,
              messagesCount: cmd.conversation.messages.length,
            },
          },
        })
      );

      await this.openAICommandHandler.handle(cmd);
    } catch (err: any) {
      // TODO: add better error handling, DLQ etc.
      console.error(
        JSON.stringify({
          ...this.baseProps,
          method: "handle",
          // TODO: add better logger
          err: JSON.parse(JSON.stringify(err, Object.getOwnPropertyNames(err))),
        })
      );
    }
  }
}

export const handler = createHandler(new OpenAILambda());
