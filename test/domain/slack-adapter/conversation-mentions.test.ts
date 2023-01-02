import { BOT_MENTION } from "@wisegpt/gpt-conversation-prompt";
import {
  prepareForConversationDomain,
  prepareForSlack,
} from "../../../src/domain/slack-adapter/conversation-mentions";

describe("mentions", () => {
  describe("prepareForConversationDomain()", () => {
    it("should replace all occurrences", () => {
      const botUserId = "U01";
      const input = {
        text: `hey <@${botUserId}>! how is it going? '<@${botUserId}>'`,
        botUserId,
      };

      expect(prepareForConversationDomain(input)).toMatchInlineSnapshot(
        `"hey <@bot>! how is it going? '<@bot>'"`
      );
    });
  });

  describe("prepareForSlack()", () => {
    it("should replace all ocurrences", () => {
      const botUserId = "U01";
      const input = {
        text: `hey ${BOT_MENTION}! how is it going? '${BOT_MENTION}'`,
        botUserId,
      };

      expect(prepareForSlack(input)).toMatchInlineSnapshot(
        `"hey <@U01>! how is it going? '<@U01>'"`
      );
    });
  });
});
