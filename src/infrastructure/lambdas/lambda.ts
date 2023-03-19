import type * as Lambda from "aws-lambda";
import {
  SlackEventType,
  SlackMessageEventWithEnvelope,
} from "../../domain/slack-adapter/slack-adapter.dto";

export type SQSEvent = Lambda.SQSEvent;

abstract class BaseLambda<TEvent = any, TResult = any> {
  protected constructor(protected readonly baseProps: { lambdaName: string }) {}

  abstract handle(event: TEvent, context: Lambda.Context): Promise<TResult>;
}

export abstract class AsyncLambda<TEvent = any> extends BaseLambda<
  TEvent,
  void
> {}

type SlackEventDetailMapping = {
  [SlackEventType.MESSAGE]: {
    detailType: "EventCallback.message";
    detail: SlackMessageEventWithEnvelope;
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

export abstract class EventListenerLambda<
  T extends Lambda.EventBridgeEvent<any, any> = Lambda.EventBridgeEvent<
    any,
    any
  >
> extends BaseLambda<T> {
  handle(event: any, context: Lambda.Context): Promise<any> {
    if (event.id && event["detail-type"]) {
      return this.handleEventBridgeEvent(event, context);
    } else if (Array.isArray(event.Records)) {
      return this.handleSQSEvent(event, context);
    } else if (event.rawPath && event.headers) {
      return this.handleAPIGatewayProxyEvent(event, context);
    }

    throw new Error("unknown error, not event bridge nor sqs event");
  }

  protected handleAPIGatewayProxyEvent(
    _event: Lambda.APIGatewayProxyEventV2,
    _context: Lambda.Context
  ): Promise<Lambda.APIGatewayProxyStructuredResultV2> {
    throw new Error(
      `Lambda '${this.baseProps.lambdaName}' did not override #handleAPIGatewayProxyEvent()`
    );
  }

  protected handleEventBridgeEvent(
    _event: T,
    _context: Lambda.Context
  ): Promise<void> {
    throw new Error(
      `Lambda '${this.baseProps.lambdaName}' did not override #handleEventBridgeEvent()`
    );
  }

  protected handleSQSEvent(
    _event: SQSEvent,
    _context: Lambda.Context
  ): Promise<Lambda.SQSBatchResponse | void> {
    throw new Error(
      `Lambda '${this.baseProps.lambdaName}' did not override #handleSQSEvent()`
    );
  }
}

export const createHandler =
  (lambda: BaseLambda): Lambda.Handler =>
  (event, context) =>
    lambda.handle(event, context);
