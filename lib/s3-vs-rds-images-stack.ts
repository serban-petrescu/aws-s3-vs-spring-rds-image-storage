import {
    CfnOutput,
    RemovalPolicy,
    SecretValue,
    Stack,
    StackProps,
} from "aws-cdk-lib";
import { Distribution, KeyGroup, PublicKey } from "aws-cdk-lib/aws-cloudfront";
import { S3Origin } from "aws-cdk-lib/aws-cloudfront-origins";
import {
    InstanceClass,
    InstanceSize,
    InstanceType,
    Port,
    SecurityGroup,
    SubnetType,
    Vpc,
} from "aws-cdk-lib/aws-ec2";
import { ContainerImage } from "aws-cdk-lib/aws-ecs";
import { ApplicationLoadBalancedFargateService } from "aws-cdk-lib/aws-ecs-patterns";
import { Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import {
    Credentials,
    DatabaseInstance,
    DatabaseInstanceEngine,
    PostgresEngineVersion,
} from "aws-cdk-lib/aws-rds";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
import { Construct } from "constructs";
import { readFileSync } from "fs";
import { join } from "path";

const APP_DIR = join(__dirname, "..", "app");
export class S3VsRdsImagesStack extends Stack {
    private bucket: Bucket;
    private vpc: Vpc;
    private rds: DatabaseInstance;
    private rdsSg: SecurityGroup;
    private cfKey: PublicKey;
    private dist: Distribution;

    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        this.createBucket();
        this.createDistribution();
        this.createVpc();
        this.createRds();
        this.createService();
    }

    private createService() {
        const taskRole = new Role(this, "TaskRole", {
            assumedBy: new ServicePrincipal("ecs-tasks.amazonaws.com"),
        });
        this.bucket.grantRead(taskRole);

        const serviceSg = new SecurityGroup(this, "ServiceSg", {
            vpc: this.vpc,
            allowAllOutbound: true,
        });
        this.rdsSg.addIngressRule(serviceSg, Port.tcp(5432));
        new ApplicationLoadBalancedFargateService(this, "FargateService", {
            cpu: 512,
            memoryLimitMiB: 1024,
            desiredCount: 1,
            vpc: this.vpc,
            securityGroups: [serviceSg],
            taskSubnets: {
                subnetType: SubnetType.PUBLIC,
            },
            assignPublicIp: true,
            taskImageOptions: {
                image: ContainerImage.fromAsset(APP_DIR),
                taskRole,
                containerName: "backend",
                containerPort: 8080,
                environment: {
                    SPRING_DATASOURCE_URL:
                        "jdbc:postgresql://" +
                        this.rds.instanceEndpoint.socketAddress +
                        "/postgres",
                    RO_MSG_POC_BUCKET: this.bucket.bucketName,
                    RO_MSG_POC_DISTDOMAIN: this.dist.distributionDomainName,
                    RO_MSG_POC_KEYID: this.cfKey.publicKeyId
                },
            },
        });
    }

    private createRds() {
        this.rdsSg = new SecurityGroup(this, "RdsSg", {
            vpc: this.vpc,
            allowAllOutbound: false,
        });
        this.rds = new DatabaseInstance(this, "Rds", {
            vpc: this.vpc,
            instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.SMALL),
            vpcSubnets: {
                subnetType: SubnetType.PRIVATE_ISOLATED,
            },
            engine: DatabaseInstanceEngine.postgres({
                version: PostgresEngineVersion.VER_10,
            }),
            credentials: Credentials.fromPassword(
                "postgres",
                SecretValue.plainText("postgres")
            ),
            securityGroups: [this.rdsSg],
            removalPolicy: RemovalPolicy.DESTROY,
        });
    }

    private createVpc() {
        this.vpc = new Vpc(this, "Vpc", {
            maxAzs: 2,
            subnetConfiguration: [
                {
                    name: "Public",
                    subnetType: SubnetType.PUBLIC,
                },
                {
                    name: "Private",
                    subnetType: SubnetType.PRIVATE_ISOLATED,
                },
            ],
        });
    }

    private createBucket() {
        this.bucket = new Bucket(this, "Bucket", {
            removalPolicy: RemovalPolicy.DESTROY,
        });

        new BucketDeployment(this, "DeployBucket", {
            destinationBucket: this.bucket,
            sources: [
                Source.asset(
                    join(APP_DIR, "src", "main", "resources", "static")
                ),
            ],
            retainOnDelete: false,
        });

        new CfnOutput(this, "BucketName", {
            value: this.bucket.bucketName,
        });
    }

    private createDistribution() {
        this.cfKey = new PublicKey(this, "PubKey", {
            encodedKey: readFileSync(join(__dirname, "public.pem"), {
                encoding: "utf-8",
            }),
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

        new CfnOutput(this, "DistributionDomain", {
            value: this.dist.distributionDomainName,
        });
        new CfnOutput(this, "KeyPairId", {
            value: this.cfKey.publicKeyId,
        });
    }
}
