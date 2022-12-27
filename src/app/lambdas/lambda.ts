import type * as Lambda from "aws-lambda";

abstract class BaseLambda<TEvent = any, TResult = any> {
  protected constructor(protected readonly baseProps: { lambdaName: string }) {}

  abstract handle(event: TEvent, context: Lambda.Context): Promise<TResult>;
}

export enum SlackEventType {
  APP_MENTION = "app_mention",
  MESSAGE = "message",
}

type SlackEventEnvelope<T extends SlackEventType, TEventPayload> = {
  type: "event_callback";
  event_id: string;
  api_app_id: string;
  team_id: string;
  event_time: number;
  event: TEventPayload & { type: T };
};

type SlackEventDetailMapping = {
  [SlackEventType.APP_MENTION]: {
    detailType: "EventCallback.app_mention";
    detail: SlackEventEnvelope<
      SlackEventType.APP_MENTION,
      {
        user: string;
        text: string;
        team: string;
        channel: string;
        ts: string;
        thread_ts?: string;
      }
    >;
  };
  [SlackEventType.MESSAGE]: {
    detailType: "EventCallback.message";
    detail: SlackEventEnvelope<SlackEventType.MESSAGE, {}>;
  };
};

export interface SlackEventBridgeEvent<
  T extends SlackEventType = SlackEventType
> extends Lambda.EventBridgeEvent<
    SlackEventDetailMapping[T]["detailType"],
    SlackEventDetailMapping[T]["detail"]
  > {}

export function isSlackEventTypeOf<T extends SlackEventType>(
  event: SlackEventBridgeEvent,
  type: T
): event is SlackEventBridgeEvent<T> {
  return event["detail-type"] === `EventCallback.${type}`;
}

abstract class EventListenerLambda<
  T extends Lambda.EventBridgeEvent<any, any>
> extends BaseLambda<T, void> {
  protected abstract process(event: T, context: Lambda.Context): Promise<void>;

  handle(event: T, context: Lambda.Context): Promise<void> {
    return this.process(event, context);
  }
}

export abstract class SlackEventListenerLambda<
  T extends SlackEventType = SlackEventType
> extends EventListenerLambda<SlackEventBridgeEvent<T>> {}

export const createHandler =
  (lambda: BaseLambda): Lambda.Handler =>
  (event, context) =>
    lambda.handle(event, context);
