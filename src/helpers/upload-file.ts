export async function uploadFile(file: File) {
  // Get presigned URL from server
  const res = await fetch(
    `/api/file-upload?filename=${window.encodeURIComponent(file.name)}`,
    { method: "POST" }
  );
  if (!res.ok) throw res;

  const { presigned_url, url, content_type } = await res.json();

  // Upload directly to S3 using presigned URL
  const upload_res = await fetch(presigned_url, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": content_type },
  });
  if (!upload_res.ok) throw upload_res;

  return url;
}
