import { EventBus, globalEventBus } from "../../domain/bus/event-bus";
import { ConversationAggregateDynamodbRepository } from "../dynamodb/conversation-aggregate-dynamodb.repository";
import {
  AddUserMessageCommand,
  ConversationCommand,
  CreateConversationCommand,
  Message,
} from "../../domain/conversation/conversation.dto";
import { ConversationAggregate } from "../../domain/conversation/conversation.aggregate";
import { TriggerBotService } from "../../domain/conversation/trigger-bot.service";
import * as crypto from "crypto";

function assertUnreachable(value: never): never {
  throw new Error(`expected value to be unreachable: '${value}'`);
}

export class ConversationCommandHandler {
  constructor(
    private readonly eventBus: EventBus = globalEventBus,
    private readonly repository: ConversationAggregateDynamodbRepository = new ConversationAggregateDynamodbRepository()
  ) {}

  execute(cmd: ConversationCommand): Promise<void> {
    switch (cmd.type) {
      case "CREATE_CONVERSATION_COMMAND":
        return this.executeCreateConversation(cmd);
      case "ADD_USER_MESSAGE_COMMAND":
        return this.executeAddUserMessage(cmd);
      default:
        return assertUnreachable(cmd);
    }
  }

  private async executeCreateConversation(
    cmd: CreateConversationCommand
  ): Promise<void> {
    const aggregate = ConversationAggregate.createConversation(
      cmd.conversationId,
      cmd.metadata
    );

    await this.repository.create(aggregate);

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
      (aggregate: ConversationAggregate) => {
        aggregate.addUserMessage(cmd);
      }
    );

    // next step, we want the aggregate to decide what to do
    const status = {
      isTriggered: false,
      result: Promise.resolve({ message: "" }),
    };

    const correlationId = crypto.randomUUID();
    const triggerBotService: TriggerBotService = {
      trigger(messages: Message[]) {
        status.isTriggered = true;

        status.result = new Promise((resolve) =>
          setTimeout(resolve, 3000)
        ).then(() => ({
          message: `your total message count for this thread is: ${messages.length}`,
        }));
      },
    };

    await this.transaction(
      cmd.conversationId,
      (aggregate: ConversationAggregate) => {
        aggregate.reactToUserMessage(correlationId, triggerBotService);
      }
    );

    if (status.isTriggered) {
      const botResponse = await status.result;

      await this.transaction(
        cmd.conversationId,
        (aggregate: ConversationAggregate) => {
          aggregate.addBotResponse({
            type: "BOT_RESPONSE_SUCCESS",
            message: botResponse.message,
            correlationId,
          });
        }
      );
    }
  }

  private async transaction(
    conversationId: string,
    work: (aggregate: ConversationAggregate) => void
  ): Promise<void> {
    const aggregate = await this.repository.getById(conversationId);
    if (!aggregate) {
      throw new Error(
        `expected aggregate with id '${conversationId}' to exist`
      );
    }

    work(aggregate);

    if (aggregate.events.length < 1) {
      return;
    }

    await this.repository.update(aggregate);

    for (const event of aggregate.events) {
      await this.eventBus.publish(event);
    }
  }
}
