import type * as Lambda from "aws-lambda";
import { KnownBlock } from "@slack/web-api";

abstract class BaseLambda<TEvent = any, TResult = any> {
  protected constructor(protected readonly baseProps: { lambdaName: string }) {}

  abstract handle(event: TEvent, context: Lambda.Context): Promise<TResult>;
}

export enum SlackEventType {
  MESSAGE = "message",
}

type SlackEventEnvelope<T extends SlackEventType, TEventPayload> = {
  type: "event_callback";
  event_id: string;
  api_app_id: string;
  team_id: string;
  event_time: number;
  event: TEventPayload & { type: T };
  authorizations: { is_bot?: boolean; user_id?: string }[];
};

export type SlackMessageEventPayload = {
  user: string;
  text: string;
  team: string;
  channel: string;
  ts: string;
  app_id?: string;
  thread_ts?: string;
  blocks?: KnownBlock[];
  // specific to message event
  subtype?: string;
};

type SlackEventDetailMapping = {
  [SlackEventType.MESSAGE]: {
    detailType: "EventCallback.message";
    detail: SlackEventEnvelope<
      SlackEventType.MESSAGE,
      SlackMessageEventPayload
    >;
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
