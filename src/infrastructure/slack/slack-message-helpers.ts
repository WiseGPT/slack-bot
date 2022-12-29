import { ChatPostMessageArguments, ChatUpdateArguments } from "@slack/web-api";

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

  static updateWithResponse(markdownBody: string): UpdateWithResponseOutput {
    return {
      text: markdownBody,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: markdownBody,
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
}
