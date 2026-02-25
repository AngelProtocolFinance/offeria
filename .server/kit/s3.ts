import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Resource } from "sst";
import { nvs_shared } from "../env";

export { PutObjectCommand };

export const s3 = new S3Client({});

export const bucket_name = Resource.bucket.name;

export const get_public_url = (key: string) =>
  `https://${bucket_name}.s3.${nvs_shared.aws.region}.amazonaws.com/${key}`;

export async function get_presigned_put_url(
  key: string,
  content_type: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: bucket_name,
    Key: key,
    ContentType: content_type,
  });
  return getSignedUrl(s3, command, { expiresIn: 300 });
}
