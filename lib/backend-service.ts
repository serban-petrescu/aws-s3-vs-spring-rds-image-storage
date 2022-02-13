import { RemovalPolicy, SecretValue } from "aws-cdk-lib";
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
import { Construct } from "constructs";
import { ImageStorage } from "./image-storage";

interface BackendServiceProps {
    imageStorage: ImageStorage;
    appPath: string;
}

export class BackendService extends Construct {
    private vpc: Vpc;
    private rds: DatabaseInstance;
    private rdsSg: SecurityGroup;

    constructor(
        scope: Construct,
        id: string,
        { imageStorage, appPath }: BackendServiceProps
    ) {
        super(scope, id);

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

        const taskRole = new Role(this, "TaskRole", {
            assumedBy: new ServicePrincipal("ecs-tasks.amazonaws.com"),
        });
        imageStorage.bucket.grantRead(taskRole);

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
                image: ContainerImage.fromAsset(appPath),
                taskRole,
                containerName: "backend",
                containerPort: 8080,
                environment: {
                    SPRING_DATASOURCE_URL:
                        "jdbc:postgresql://" +
                        this.rds.instanceEndpoint.socketAddress +
                        "/postgres",
                    RO_MSG_POC_BUCKET: imageStorage.bucket.bucketName,
                    RO_MSG_POC_DISTDOMAIN:
                        imageStorage.dist.distributionDomainName,
                    RO_MSG_POC_KEYID: imageStorage.cfKey.publicKeyId,
                },
            },
        });
    }
}
