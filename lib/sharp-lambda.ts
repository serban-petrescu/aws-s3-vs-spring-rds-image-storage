import { S3CreateEvent, S3EventRecord } from "aws-lambda";
import { S3 } from "aws-sdk";
import { basename, extname } from "path";
import { gzip } from "zlib";
import sharp = require("sharp");

const WIDTHS = [200, 400, 800, 1600, 3200];

const s3 = new S3();

function zip(input: Buffer): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) =>
        gzip(input, (error, result) =>
            error ? reject(error) : resolve(result)
        )
    );
}

async function upload(key: string, body: Buffer, type: string): Promise<void> {
    await s3
        .putObject({
            Bucket: process.env.TARGET_BUCKET || "",
            Key: key,
            Body: body,
            ContentType: type,
            ContentEncoding: "gzip",
        })
        .promise();
}

async function download(record: S3EventRecord): Promise<Buffer> {
    const file = await s3
        .getObject({
            Bucket: record.s3.bucket.name,
            Key: record.s3.object.key,
        })
        .promise();
    console.log("Read file", file);
    return file.Body as Buffer;
}

export async function handler(event: S3CreateEvent): Promise<void> {
    console.log("Received event", JSON.stringify(event, null, 4));
    for (const record of event.Records) {
        const inputKey = record.s3.object.key;
        const input = sharp(await download(record));
        for (const width of WIDTHS) {
            const outputKey =
                basename(inputKey, extname(inputKey)) + `-${width}.webp`;
            const zipped = await zip(
                await input.clone().toFormat("webp").resize(width).toBuffer()
            );
            await upload(outputKey, zipped, "image/webp");
            console.log("Uploaded version " + outputKey);
        }
        const original = await input.toBuffer({ resolveWithObject: true });
        await upload(inputKey, original.data, "image/" + original.info.format);
    }
}
