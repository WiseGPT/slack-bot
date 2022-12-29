export default {
  slack: {
    appId: "A04G99ST35L",
  },
  aws: {
    secretArn:
      "arn:aws:secretsmanager:eu-west-1:197771300946:secret:wisegpt-bot-3yGDD6",
  },
  bot: {
    // to be used in database records
    userId: "wisegpt",
    // to be used in OpenAI prompts
    name: "WsGPT",
  },
  conversation: {
    // which persona to use for conversations see `src/domain/persona/index.ts`
    persona: "slack-software-eng",
  },
};
