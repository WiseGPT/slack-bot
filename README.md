# @wisegpt/slack-bot

Slack Bot for communicating with WiseGPT. Uses OpenAI GPT-3 to simulate a ChatGPT like conversation. With each new message, the whole conversation is sent to GPT for completion. Summarization of the Conversation is done (per configuration parameters) to keep the prompts small, even if Conversation gets long. 

https://user-images.githubusercontent.com/3743507/209952150-4555aee0-3f1b-4481-893a-0675a6108e3d.mp4

## Bot Features

- Persona of the bot can be customized
- Only gets involved to the conversations that start with mentioning the bot E.g. `@WiseGPT hello!`
- No need to mention bot again for further messages in the same thread
- Keeps conversation history per thread
- Can keep reference of multiple actors and their details. Mentions actors properly when addressing them. 
- Conversations **are summarized** per configuration to keep token usage small
- You can limit maximum token used per conversation
- Simple loading indicator is shown before calling OpenAI
- Markdown and Slack Blocks are used for output

## Setup

This project uses AWS CDK for deployment. All infrastructure is automatically provisioned and managed for you. Everything is serverless and should cost **almost nothing**. You only pay for the OpenAI API tokens used.

1. Create your own Slack bot.
2. Create an AWS account and set up your profile.
3. Create an AWS Secrets Manager Secret.
   1. Configure `app/YOUR_APP_ID/signing-secret` e.g. `app/A04G99ST35L/signing-secret` to your Slack API Signing Secret
   2. Configure `app/YOUR_APP_ID/token` e.g. `app/A04G99ST35L/token` to your Slack API token
   3. Configure `open-ai/secret-key` to your OpenAI Secret Key
   4. Create the secret and copy the Secret ARN
4. Configure `src/config.ts` with your information. Especially `slack` and `aws` sections.
5. Bootstrap AWS CDK for your account, if you have not already.
6. Deploy with `AWS_PROFILE=your-profile npx projen deploy`
7. Add output Slack Events Request URL to Slack API Events URL

## Token Usage Limits

The configuration of allowed maximum tokens and summarization is stored in `src/config.ts`. Following the below structure:

```typescript
export default { 
  // ...
  conversation: {
    // ...
    maximumSpentTokens: Number.MAX_SAFE_INTEGER,
     // conditions for triggering summarization
     summarization: { 
      // minimum amount the token sum of all human/bot messages (since last summarization) should reach
      // the summary size itself is not included into this count
      minimumTokens: 500,
      // minimum amount of user messages since last summarization
      minimumUserMessages: 2,
     }
  }
}
```

If you want to limit per conversation, how much can be spent. Use the `maximumSpentTokens` to set a limit that no conversation can exceed. The total tokens are calculated according to how much token did all completion and summarization requests used. The source of truth for spent tokens are the OpenAI API itself.

### Summarization Logic

Every time the bot responds to the chat, the configuration is checked to decide; whether a summarization should be done or not. If the summarization is triggered, OpenAI GPT is asked to summarize the whole conversation into a paragraph.

All further completion calls will just use the Summary and the messages since the last summary. Example summary of a conversation is as follows; `<@U04G77EL6CW> asked <@bot> for a recursive Fibonacci function written in Typescript, with comments and explanation. <@bot> provided a code example and asked if there was anything else they could help with. <@U04G77EL6CW> then asked <@bot> to refactor the last code to be iterative, with more explanation. <@bot> provided a code example for an iterative version of the Fibonacci function.`

The decision of summarization is done after every time bot response is added to the conversation. Below checks are done to decide whether to do or not to do summary:

- Conversation is still ongoing, there is no errors, ongoing operations etc.
- Calculates total conversation tokens, according to messages sent since the last summary. Both bot and user messages are counted. Then the `conversation.summarization.minimumTokens` is checked to make sure minimum threshold is reached.
- The amount of non-bot messages in the conversations since the last summary is calculated. `conversation.summarization.minimumUserMessages` is checked to make sure minimum threshold is reached.

Summarization may happen multiple times. Each time, the previous summary, alongside with all messages since the previous summary are sent. The first summarization request does not have any previous sumary.

## Disclaimer

1. The bot is in active early development and there maybe non-backwards compatible change. E.g. some older conversations may stop working after deploying a newer version of the bot.

## Thanks

Below projects were helpful when developing this bot, in no specific order:

- [firtoz/GPT-Shell](https://github.com/firtoz/GPT-Shell)
- [Kav-K/GPT3Discord](https://github.com/Kav-K/GPT3Discord)
- [openai/gpt-discord-bot](https://github.com/openai/gpt-discord-bot)
