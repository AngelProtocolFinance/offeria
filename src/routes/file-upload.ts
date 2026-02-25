import { get_presigned_put_url, get_public_url } from "$/kit/s3";
import { search } from "@/helpers/https";
import { type ActionFunction, data } from "react-router";
import { nonEmpty, parse, pipe, string } from "valibot";

export const action: ActionFunction = async ({ request }) => {
  const { filename } = search(request);
  const name = parse(pipe(string(), nonEmpty()), filename);

  const content_type = get_content_type(name);
  const presigned_url = await get_presigned_put_url(name, content_type);

  return data({
    presigned_url,
    url: get_public_url(name),
    content_type,
  });
};

function get_content_type(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  const types: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    pdf: "application/pdf",
    mp4: "video/mp4",
    webm: "video/webm",
  };
  return types[ext || ""] || "application/octet-stream";
}
