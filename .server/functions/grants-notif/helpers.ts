import type { EmailParams } from "./types";

export function to_YYMM(date: string) {
  const _date = date.split("-");
  const YY = _date[0].substring(2, 4);
  const MM = _date[1];
  return YY + MM;
}

export const raw_email = (params: EmailParams): string => {
  /**
   * format and spacing is important
   * @link https://docs.aws.amazon.com/ses/latest/dg/send-email-raw.html
   */
  return `From: ${params.from}
To: ${params.tos.join(", ")}
Subject: ${params.subject}
Content-Type: multipart/mixed;
  boundary="boundaryidentifier"

--boundaryidentifier
Content-Type: text/html; charset=iso-8859-1
Content-Transfer-Encoding: quoted-printable

<html>
<head></head>
<body>
${params.body}
</body>
</html>

--boundaryidentifier
Content-Type: text/csv; name="${params.attachment.fileName}"
Content-Description: ${params.attachment.fileName}
Content-Disposition: attachment; filename="${params.attachment.fileName}";
Content-Transfer-Encoding: base64

${params.attachment.content}

--boundaryidentifier--
`;
};
