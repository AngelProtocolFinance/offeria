import { antropic } from "$/kit/anthropic";
import { Output, generateText } from "ai";
import { z } from "zod";

interface IFundraiser {
  title: string;
  description: string;
}

const SPAM_CATEGORIES = [
  "commercial",
  "drugs",
  "ad",
  "terrorism",
  "fraud",
  "adult",
  "hate",
  "spam",
  "other",
] as const;

const evaluation_schema = z.object({
  is_spam: z.boolean().describe("true=violation, false=ok"),
  spam_score: z
    .number()
    .min(0)
    .max(1)
    .describe("0-1, 0.9+ for obvious violations"),
  category: z
    .enum(SPAM_CATEGORIES)
    .optional()
    .describe("required if is_spam=true"),
  explanation: z.string().describe("max 10 words"),
  field: z.enum(["name", "description"]).describe("field with violation"),
});

type IEvaluation = z.infer<typeof evaluation_schema>;

const SYSTEM = `Nonprofit fundraiser moderator. Flag violations. Any language.
SPAM: commercial/sales, scams, phishing, spam patterns, contact harvesting, illegal (drugs/weapons/terrorism), adult/hate content, impersonation.
ALLOW: medical, charity, education, memorials, disaster relief, animals, faith-based, community.
Strict on commercial intent. Typos≠spam. When uncertain, allow.`;

const format = Output.object({ schema: evaluation_schema });

export const evaluate = async (
  fundraiser: IFundraiser
): Promise<IEvaluation> => {
  const { output } = await generateText({
    model: antropic("claude-3-5-haiku-latest"),
    output: format,
    system: SYSTEM,
    prompt: `Title: ${fundraiser.title}\nDesc: ${fundraiser.description}`,
    temperature: 0,
    maxRetries: 1,
  });

  return output as IEvaluation;
};
