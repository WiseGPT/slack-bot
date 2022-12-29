export class RequestContext {
  constructor(public readonly lambdaName: string) {}
}

export class Tools {
  /**
   * `Index.initialize` only supposed to be used in Lambda deployments
   */
  static initialize(requestContext: RequestContext) {
    this.instance = new Tools(requestContext);
  }

  /**
   * `Index.getInstance` only supposed to be used in Lambda deployments
   * using it in other types of developments could cause unintended effects
   * like request contexts getting mixed when multiple requests are processed
   * by the same application instance asynchronously
   */
  static getInstance(): Tools {
    if (this.instance === undefined) {
      throw new Error(
        "Index.getInstance called before Lambda had to chance to initialize an instance"
      );
    }

    return this.instance;
  }

  private static instance: Tools | undefined;

  private constructor(_requestContext: RequestContext) {}
}
