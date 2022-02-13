#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { S3VsRdsImagesStack } from "../lib/s3-vs-rds-images-stack";

const app = new cdk.App();
new S3VsRdsImagesStack(app, "S3VsRdsImagesStack", { withBackend: false });
