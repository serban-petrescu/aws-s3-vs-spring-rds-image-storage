import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { join } from "path";
import { BackendService } from "./backend-service";
import { ImageStorage } from "./image-storage";

const APP_DIR = join(__dirname, "..", "app");

interface S3VsRdsStackProps extends StackProps {
    withBackend?: boolean;
}
export class S3VsRdsImagesStack extends Stack {
    constructor(scope: Construct, id: string, props: S3VsRdsStackProps) {
        super(scope, id, props);

        const storage = new ImageStorage(this, "Storage", {
            assetPath: join(APP_DIR, "src", "main", "resources", "static"),
            keyPath: join(__dirname, "public.pem"),
        });

        if (props.withBackend) {
            new BackendService(this, "Backend", {
                imageStorage: storage,
                appPath: APP_DIR,
            });
        }
    }
}
