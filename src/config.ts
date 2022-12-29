export default {
  slack: {
    appId: "A04G99ST35L",
  },
  aws: {
    stackName: "wisegpt-slack-bot",
    secretArn:
      "arn:aws:secretsmanager:eu-west-1:197771300946:secret:wisegpt-bot-3yGDD6",
  },
  conversation: {
    // which persona to use for conversations see `src/domain/persona/index.ts`
    personaConfigName: "slack-software-eng",
  },
};
