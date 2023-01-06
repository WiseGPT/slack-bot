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
    // ends the conversation when sum of total tokens goes over `maximumSpentTokens`
    // all summarization and completion requests are counted towards the total tokens
    // persona adds overhead to each request
    maximumSpentTokens: Number.MAX_SAFE_INTEGER,
  },
};
