import { ConversationCommandHandler } from "../../application/conversation/conversation-command.handler";
import { DomainCommand } from "../../domain/bus/command-bus";
import { createHandler, EventListenerLambda, SQSEvent } from "./lambda";

class ConversationLambda extends EventListenerLambda {
  constructor(
    private readonly conversationCommandHandler = new ConversationCommandHandler()
  ) {
    super({ lambdaName: "ConversationLambda" });
  }

  protected async handleSQSEvent({ Records }: SQSEvent) {
    try {
      const cmd: DomainCommand = JSON.parse(Records[0].body);

      await this.conversationCommandHandler.execute(cmd);
    } catch (err) {
      // TODO: add better error handling, DLQ etc.
      console.error(
        JSON.stringify({
          ...this.baseProps,
          method: "handleSQSEvent",
          // TODO: add better logger
          err: JSON.parse(JSON.stringify(err, Object.getOwnPropertyNames(err))),
        })
      );
    }
  }
}

export const handler = createHandler(new ConversationLambda());
