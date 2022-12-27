import { ChatPostMessageArguments, ChatUpdateArguments } from "@slack/web-api";

type CreateMessageOutput = Required<
  Pick<ChatPostMessageArguments, "text" | "blocks">
>;

type UpdateMessageOutput = Required<
  Pick<ChatUpdateArguments, "text" | "blocks">
>;

export class SlackMessageHelpers {
  static createInitialMessage(): CreateMessageOutput {
    const CREATING_RESPONSE = "Creating a response...";

    return {
      text: CREATING_RESPONSE,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: CREATING_RESPONSE,
            emoji: true,
          },
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: ":hourglass_flowing_sand: hold on for a few seconds...",
            },
          ],
        },
      ],
    };
  }

  static updateWithResponse(markdownBody: string): UpdateMessageOutput {
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
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Re-generate",
              },
              value: "click_me_123",
            },
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "End Conversation",
              },
              value: "click_me_1234",
            },
          ],
        },
      ],
    };
  }

  static updateAfterNewMessage(markdownBody: string): UpdateMessageOutput {
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
      ],
    };
  }
}
