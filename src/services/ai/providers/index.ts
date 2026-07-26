import type { ChatProvider } from "../types";
import { AiProviderError } from "../types";
import { openAiProvider } from "./openai";
import { anthropicProvider } from "./anthropic";
import { geminiProvider } from "./gemini";

export type { ChatProvider } from "../types";

const PROVIDERS: Record<string, ChatProvider> = {
  openai: openAiProvider,
  anthropic: anthropicProvider,
  gemini: geminiProvider,
};

/**
 * Resolves which AI provider to use from the AI_PROVIDER env var
 * (openai | anthropic | gemini). Falls back to whichever provider has an
 * API key configured, so a fresh deployment "just works" once a single key
 * is added — no code changes needed to switch providers later.
 */
export function getAiProvider(): ChatProvider {
  const configured = process.env.AI_PROVIDER?.toLowerCase().trim();
  if (configured) {
    const provider = PROVIDERS[configured];
    if (!provider) {
      throw new AiProviderError(
        `Unknown AI_PROVIDER "${configured}"`,
        "The AI assistant is misconfigured — check the AI_PROVIDER environment variable.",
      );
    }
    return provider;
  }

  if (process.env.ANTHROPIC_API_KEY) return anthropicProvider;
  if (process.env.OPENAI_API_KEY) return openAiProvider;
  if (process.env.GOOGLE_AI_API_KEY) return geminiProvider;

  throw new AiProviderError(
    "No AI provider configured",
    "The AI assistant isn't set up yet — add an API key (OpenAI, Anthropic, or Gemini) in the server environment.",
  );
}
