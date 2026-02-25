export interface CsvRow {
  "endow-id": number;
  "endow-name": string;
  /** this period's savings balance */
  "grant-amount": number;
}

export type EmailParams = {
  from: string;
  tos: string[];
  subject: string;
  body: string;
  attachment: {
    fileName: string;
    /** base64 encoded */
    content: string;
  };
};
