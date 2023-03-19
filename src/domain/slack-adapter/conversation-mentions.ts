import { ASSISTANT_MENTION } from "@wisegpt/gpt-conversation-prompt";

const ASSISTANT_MENTION_REGEX = new RegExp(ASSISTANT_MENTION, "g");

export function prepareForConversationDomain({
  text,
  botUserId,
}: {
  text: string;
  botUserId: string;
}) {
  return text.replace(new RegExp(`<@${botUserId}>`, "g"), ASSISTANT_MENTION);
}

export function prepareForSlack({
  text,
  botUserId,
}: {
  text: string;
  botUserId: string;
}): string {
  return text.replace(ASSISTANT_MENTION_REGEX, `<@${botUserId}>`);
}
