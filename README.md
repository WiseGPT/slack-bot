# @wisegpt/slack-bot

Slack Bot for communicating with WiseGPT. Uses OpenAI GPT-3 to simulate a ChatGPT like conversation. The GPT model is in early development and not optimized, will consume more token as the conversation gets bigger.

https://user-images.githubusercontent.com/3743507/209952150-4555aee0-3f1b-4481-893a-0675a6108e3d.mp4

## Bot Features

- Persona of the bot can be customized since it is using GPT-3
- Only gets involved to the conversations that start with mentioning the bot E.g. `@WiseGPT hello!`
- No need to mention bot again for further messages in the same thread
- Keeps conversation history per thread
- Can keep reference of multiple actors in the same conversation.
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

## Disclaimer

1. The bot is in active early development and there maybe non-backwards compatible change. E.g. some older conversations may stop working after deploying a newer version of the bot.
2. The token usage maybe high since there was no effort to optimize the used tokens for now. It is a planned feature.

## Thanks

Below projects were helpful when developing this bot, in no specific order:

- [firtoz/GPT-Shell](https://github.com/firtoz/GPT-Shell)
- [Kav-K/GPT3Discord](https://github.com/Kav-K/GPT3Discord)
- [openai/gpt-discord-bot](https://github.com/openai/gpt-discord-bot)
