import { EventBus, globalEventBus } from "../../domain/bus/event-bus";
import { ConversationAIService } from "../../domain/conversation/ai/conversation-ai.service";
import { ConversationAggregate } from "../../domain/conversation/conversation.aggregate";
import {
  AddUserMessageCommand,
  ConversationCommand,
  CreateConversationCommand,
  ProcessCompletionResponseCommand,
  ProcessSummaryResponseCommand,
} from "../../domain/conversation/conversation.commands";
import { ConversationAggregateDynamodbRepository } from "../../infrastructure/dynamodb/conversation-aggregate-dynamodb.repository";
import { OpenAILambdaInvoke } from "../../infrastructure/lambdas/invoke/open-ai-lambda-invoke";

function assertUnreachable(value: never): never {
  throw new Error(`expected value to be unreachable: '${value}'`);
}

export class ConversationCommandHandler {
  constructor(
    private readonly eventBus: EventBus = globalEventBus,
    private readonly repository: ConversationAggregateDynamodbRepository = new ConversationAggregateDynamodbRepository(),
    private readonly conversationAIService: ConversationAIService = new OpenAILambdaInvoke()
  ) {}

  execute(cmd: ConversationCommand): Promise<void> {
    switch (cmd.type) {
      case "CREATE_CONVERSATION_COMMAND":
        return this.executeCreateConversation(cmd);
      case "ADD_USER_MESSAGE_COMMAND":
        return this.executeAddUserMessage(cmd);
      case "PROCESS_COMPLETION_RESPONSE_COMMAND":
        return this.executeProcessCompletionResponse(cmd);
      case "PROCESS_SUMMARY_RESPONSE_COMMAND":
        return this.executeProcessSummaryResponse(cmd);
      default:
        return assertUnreachable(cmd);
    }
  }

  private async executeCreateConversation(
    cmd: CreateConversationCommand
  ): Promise<void> {
    const aggregate = ConversationAggregate.create(
      cmd.conversationId,
      cmd.metadata
    );

    await this.repository.save(aggregate);

    for (const event of aggregate.events) {
      await this.eventBus.publish(event);
    }

    // execute another command, as if
    await this.executeAddUserMessage({
      type: "ADD_USER_MESSAGE_COMMAND",
      conversationId: cmd.conversationId,
      message: cmd.initialMessage,
    });
  }

  private async executeAddUserMessage(
    cmd: AddUserMessageCommand
  ): Promise<void> {
    await this.transaction(
      cmd.conversationId,
      (aggregate: ConversationAggregate) =>
        aggregate.addUserMessage(cmd, this.conversationAIService)
    );
  }

  private async executeProcessCompletionResponse(
    cmd: ProcessCompletionResponseCommand
  ): Promise<void> {
    return this.transaction(
      cmd.conversationId,
      (aggregate: ConversationAggregate) =>
        aggregate.processCompletionResponse(cmd, this.conversationAIService)
    );
  }

  private async executeProcessSummaryResponse(
    cmd: ProcessSummaryResponseCommand
  ): Promise<void> {
    return this.transaction(
      cmd.conversationId,
      (aggregate: ConversationAggregate) =>
        aggregate.processSummaryResponse(cmd, this.conversationAIService)
    );
  }

  private async transaction(
    conversationId: string,
    work: (aggregate: ConversationAggregate) => Promise<void>
  ): Promise<void> {
    const aggregate = await this.repository.load(conversationId);
    if (!aggregate) {
      throw new Error(
        `expected aggregate with id '${conversationId}' to exist`
      );
    }

    await work(aggregate);

    if (aggregate.events.length < 1) {
      return;
    }

    await this.repository.save(aggregate);

    for (const event of aggregate.events) {
      await this.eventBus.publish(event);
    }
  }
}
