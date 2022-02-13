import { CfnOutput, Duration, RemovalPolicy } from "aws-cdk-lib";
import { Distribution, KeyGroup, PublicKey } from "aws-cdk-lib/aws-cloudfront";
import { S3Origin } from "aws-cdk-lib/aws-cloudfront-origins";
import { Code, LayerVersion } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Bucket, EventType } from "aws-cdk-lib/aws-s3";
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
import { LambdaDestination } from "aws-cdk-lib/aws-s3-notifications";
import { Construct } from "constructs";
import { readFileSync } from "fs";
import { join } from "path";

interface ImageStorageProps {
    assetPath: string;
    keyPath: string;
}

export class ImageStorage extends Construct {
    public readonly bucket: Bucket;
    public readonly cfKey: PublicKey;
    public readonly dist: Distribution;
    private deployment: BucketDeployment;
    private inputBucket: Bucket;

    constructor(
        scope: Construct,
        id: string,
        { assetPath, keyPath }: ImageStorageProps
    ) {
        super(scope, id);

        this.inputBucket = new Bucket(this, "InputBucket", {
            removalPolicy: RemovalPolicy.DESTROY,
        });

        this.bucket = new Bucket(this, "Bucket", {
            removalPolicy: RemovalPolicy.DESTROY,
        });

        this.deployment = new BucketDeployment(this, "DeployBucket", {
            destinationBucket: this.inputBucket,
            sources: [Source.asset(assetPath)]
        });

        this.cfKey = new PublicKey(this, "PubKey", {
            encodedKey: readFileSync(keyPath, { encoding: "utf-8" }),
        });

        const keyGroup = new KeyGroup(this, "KeyGroup", {
            items: [this.cfKey],
        });
        this.dist = new Distribution(this, "Dist", {
            defaultBehavior: {
                origin: new S3Origin(this.bucket),
                trustedKeyGroups: [keyGroup],
            },
        });

        this.createSharpLambda();

        new CfnOutput(this, "BucketName", {
            value: this.bucket.bucketName,
        });
        new CfnOutput(this, "DistributionDomain", {
            value: this.dist.distributionDomainName,
        });
        new CfnOutput(this, "KeyPairId", {
            value: this.cfKey.publicKeyId,
        });
    }

    private createSharpLambda() {
        const layer = new LayerVersion(this, "SharpLayer", {
            code: Code.fromDockerBuild(join(__dirname, "sharp-layer")),
        });
        const lambda = new NodejsFunction(this, "SharpLambda", {
            entry: join(__dirname, "sharp-lambda.ts"),
            memorySize: 2048,
            timeout: Duration.minutes(5),
            layers: [layer],
            environment: {
                TARGET_BUCKET: this.bucket.bucketName,
            },
            bundling: {
                externalModules: ["sharp"],
            },
        });
        this.bucket.grantWrite(lambda);
        this.inputBucket.grantRead(lambda);
        this.inputBucket.addEventNotification(
            EventType.OBJECT_CREATED,
            new LambdaDestination(lambda)
        );
        this.deployment.node.addDependency(lambda);
    }
}
