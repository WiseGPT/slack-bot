import { ChatPostMessageArguments, ChatUpdateArguments } from "@slack/web-api";
import { ConversationEnded } from "../../domain/conversation/conversation.events";
import { prepareForSlack } from "../../domain/slack-adapter/conversation-mentions";

type CreateMessageOutput = Required<
  Pick<ChatPostMessageArguments, "text" | "blocks">
>;

type UpdateMessageOutput = Required<
  Pick<ChatUpdateArguments, "text" | "blocks">
>;

type UpdateWithResponseOutput = UpdateMessageOutput;

export class SlackMessageHelpers {
  static createInitialMessage(): CreateMessageOutput {
    const LOADING_TEXT =
      ":hourglass_flowing_sand: hold on for a few seconds...";

    return {
      text: LOADING_TEXT,
      blocks: [
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: LOADING_TEXT,
            },
          ],
        },
      ],
    };
  }

  static updateWithResponse({
    markdownBody,
    botUserId,
  }: {
    markdownBody: string;
    botUserId: string;
  }): UpdateWithResponseOutput {
    const text = prepareForSlack({ text: markdownBody, botUserId });

    return {
      text,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text,
          },
        },
        // TODO: enable actions
        // {
        //   type: "actions",
        //   elements: [
        //     {
        //       type: "button",
        //       text: {
        //         type: "plain_text",
        //         text: "Re-generate",
        //       },
        //       value: "click_me_123",
        //     },
        //     {
        //       type: "button",
        //       text: {
        //         type: "plain_text",
        //         text: "End Conversation",
        //       },
        //       value: "click_me_1234",
        //     },
        //   ],
        // },
      ],
    };
  }

  static precedeMessage(
    previousMessage: UpdateWithResponseOutput
  ): UpdateMessageOutput {
    return {
      text: previousMessage.text,
      blocks: previousMessage.blocks.filter(({ type }) => type !== "actions"),
    };
  }

  static createConversationEndedMessage(
    event: ConversationEnded
  ): CreateMessageOutput {
    const FINISHED_TEXT = `:checkered_flag: conversation ended with reason: ${event.reason.type}`;

    return {
      text: FINISHED_TEXT,
      blocks: [
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: FINISHED_TEXT,
            },
          ],
        },
      ],
    };
  }
}
