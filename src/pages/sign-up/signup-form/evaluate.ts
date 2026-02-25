import { antropic } from "$/kit/anthropic";
import { Output, generateText } from "ai";
import { z } from "zod";

interface ISignupData {
  first_name: string;
  last_name: string;
  email: string;
}

const SPAM_CATEGORIES = [
  "fake_name",
  "test_account",
  "profanity",
  "spam",
  "bot",
  "suspicious_email",
  "other",
] as const;

const evaluation_schema = z.object({
  is_spam: z.boolean().describe("true=reject, false=allow"),
  spam_score: z
    .number()
    .min(0)
    .max(1)
    .describe("0-1, 0.9+ for obvious violations"),
  category: z
    .enum(SPAM_CATEGORIES)
    .optional()
    .describe("required if is_spam=true"),
  explanation: z.string().describe("max 8 words"),
  field: z
    .enum(["first_name", "last_name", "email"])
    .describe("field with issue"),
});

type IEvaluation = z.infer<typeof evaluation_schema>;

const SYSTEM = `Nonprofit signup validator. Any language.
REJECT: gibberish/fake names, test accounts (test/asdf/xxx), bots, profanity, disposable/temp emails, spam patterns, excessive numbers/symbols.
ALLOW: real names (all cultures), legitimate emails, minor typos.
Culturally aware—non-English names are valid. When uncertain, allow.`;

const format = Output.object({ schema: evaluation_schema });

export const evaluate = async (data: ISignupData): Promise<IEvaluation> => {
  const { output } = await generateText({
    model: antropic("claude-3-5-haiku-latest"),
    output: format,
    system: SYSTEM,
    prompt: `First: ${data.first_name}\nLast: ${data.last_name}\nEmail: ${data.email}`,
    temperature: 0,
    maxRetries: 1,
  });

  return output as IEvaluation;
};
