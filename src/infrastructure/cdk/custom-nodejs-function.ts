import { Architecture, Runtime } from "aws-cdk-lib/aws-lambda";
import {
  NodejsFunction,
  NodejsFunctionProps,
} from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import { EnvKey } from "../../env";

export type CustomNodejsFunctionProps = Pick<
  NodejsFunctionProps,
  "entry" | "description" | "timeout"
> & { environment: Record<EnvKey, string> };

export class CustomNodejsFunction extends NodejsFunction {
  constructor(scope: Construct, id: string, props: CustomNodejsFunctionProps) {
    super(scope, id, {
      ...props,
      runtime: Runtime.NODEJS_18_X,
      architecture: Architecture.ARM_64,
      awsSdkConnectionReuse: true,
      environment: {
        ...props.environment,
        NODE_OPTIONS: "--enable-source-maps",
      },
      bundling: {
        sourceMap: true,
        externalModules: ["@aws-sdk/*", "@aws-cdk/*"],
      },
    });
  }
}
