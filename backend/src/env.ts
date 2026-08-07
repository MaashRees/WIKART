import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NEO4J_URI: z.url(),
  NEO4J_USERNAME: z.string(),
  NEO4J_PASSWORD: z.string(),
  NEO4J_DATABASE: z.string(),
});

function parseEnv() {
	const env = process.env;
	const parsed = schema.safeParse(env);
	if (!parsed.success) {
		throw new Error(`Invalid environment variables: \n ${parsed.error.issues.map((i) => `- ${i.path} - ${i.message}`).join("\n")}`);
	}
	return parsed.data;
}

export const env = parseEnv();