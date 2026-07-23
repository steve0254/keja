import { useState } from "react";
import { Sparkles, Wand2, TrendingUp } from "lucide-react";
import { useAI } from "@/hooks/useAI";
import type { LandlordContext } from "@/services/ai/assistant";

interface LandlordAiPanelProps {
  context: LandlordContext;
  onUseDescription: (text: string) => void;
}

/** Small inline assistant embedded in the Add Vacancy flow — no full chat UI, just two grounded actions. */
export function LandlordAiPanel({ context, onUseDescription }: LandlordAiPanelProps) {
  const description = useAI("landlord_description");
  const price = useAI("landlord_price");
  const [activeTab, setActiveTab] = useState<"description" | "price" | null>(null);

  const descriptionText = description.entries.at(-1)?.content ?? "";
  const descriptionStreaming = description.isStreaming;
  const priceText = price.entries.at(-1)?.content ?? "";
  const priceStreaming = price.isStreaming;

  function runDescription() {
    setActiveTab("description");
    description.send("Write a listing description for this property.", context);
  }

  function runPrice() {
    setActiveTab("price");
    price.send("Suggest a fair monthly rent for this property.", context);
  }

  return (
    <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-transparent p-4">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Sparkles className="h-3.5 w-3.5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-foreground">Keja AI helper</p>
          <p className="text-[11px] text-muted-foreground">
            Grounded in real comparable listings — not a guess
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={runDescription}
          disabled={descriptionStreaming}
          className="press flex items-center justify-center gap-1.5 rounded-2xl bg-card px-3 py-2.5 text-xs font-semibold text-foreground shadow-soft disabled:opacity-60"
        >
          <Wand2 className="h-3.5 w-3.5" />
          Write description
        </button>
        <button
          type="button"
          onClick={runPrice}
          disabled={priceStreaming}
          className="press flex items-center justify-center gap-1.5 rounded-2xl bg-card px-3 py-2.5 text-xs font-semibold text-foreground shadow-soft disabled:opacity-60"
        >
          <TrendingUp className="h-3.5 w-3.5" />
          Suggest price
        </button>
      </div>

      {activeTab === "description" && (descriptionText || descriptionStreaming) && (
        <div className="mt-3 rounded-2xl bg-card p-3 text-sm text-foreground shadow-soft">
          <p className="whitespace-pre-wrap">{descriptionText || "Thinking…"}</p>
          {!descriptionStreaming && descriptionText && !description.entries.at(-1)?.isError && (
            <button
              type="button"
              onClick={() => onUseDescription(descriptionText)}
              className="press mt-2 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
            >
              Use this description
            </button>
          )}
        </div>
      )}

      {activeTab === "price" && (priceText || priceStreaming) && (
        <div className="mt-3 rounded-2xl bg-card p-3 text-sm text-foreground shadow-soft">
          <p className="whitespace-pre-wrap">{priceText || "Checking comparable rents…"}</p>
        </div>
      )}
    </div>
  );
}
