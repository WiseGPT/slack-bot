import { createHandler, EventListenerLambda, SQSEvent } from "./lambda";
import { ConversationCommandHandler } from "../conversation/conversation-command.handler";
import { DomainCommand } from "../../domain/bus/command-bus";

class ConversationLambda extends EventListenerLambda {
  constructor(
    private readonly conversationCommandHandler = new ConversationCommandHandler()
  ) {
    super({ lambdaName: "ConversationLambda" });
  }

  protected async handleSQSEvent({ Records }: SQSEvent) {
    const cmd: DomainCommand = JSON.parse(Records[0].body);

    await this.conversationCommandHandler.execute(cmd);
  }
}

export const handler = createHandler(new ConversationLambda());
