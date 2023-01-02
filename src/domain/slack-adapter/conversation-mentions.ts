import { BOT_MENTION } from "@wisegpt/gpt-conversation-prompt";

const BOT_MENTION_REGEX = new RegExp(BOT_MENTION, "g");

export function prepareForConversationDomain({
  text,
  botUserId,
}: {
  text: string;
  botUserId: string;
}) {
  return text.replace(new RegExp(`<@${botUserId}>`, "g"), BOT_MENTION);
}

export function prepareForSlack({
  text,
  botUserId,
}: {
  text: string;
  botUserId: string;
}): string {
  return text.replace(BOT_MENTION_REGEX, `<@${botUserId}>`);
}
