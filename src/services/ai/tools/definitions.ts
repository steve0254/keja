import type { AssistantMode, ToolDefinition } from "../types";

export const searchListingsTool: ToolDefinition = {
  name: "search_listings",
  description:
    "Search Keja's live vacancy listings in Nairobi by budget, area, type, bedrooms, and amenities. " +
    "Always use this instead of guessing when the renter mentions any filter criteria.",
  parameters: {
    type: "object",
    properties: {
      neighborhood: {
        type: "string",
        description: "Nairobi neighborhood or area, e.g. 'Kilimani' or 'Westlands'.",
      },
      type: {
        type: "string",
        description:
          "Listing type keyword, e.g. 'Bedsitter', 'Studio', 'One Bedroom', 'Two Bedroom', 'Maisonette', 'Shop'.",
      },
      min_bedrooms: { type: "number", description: "Minimum bedrooms required." },
      max_rent: { type: "number", description: "Maximum monthly rent in KES." },
      min_rent: { type: "number", description: "Minimum monthly rent in KES." },
      amenities: {
        type: "array",
        items: { type: "string" },
        description: "Required amenities, e.g. ['Parking', 'Wi-Fi', 'Own compound'].",
      },
      verified_only: { type: "boolean", description: "Only return verified listings." },
      keyword: {
        type: "string",
        description: "Free-text keyword to match against the title or description.",
      },
    },
  },
};

export const getListingTool: ToolDefinition = {
  name: "get_listing",
  description: "Fetch full details for one listing by its id, to explain or describe it in depth.",
  parameters: {
    type: "object",
    properties: { id: { type: "string", description: "The listing id." } },
    required: ["id"],
  },
};

export const compareListingsTool: ToolDefinition = {
  name: "compare_listings",
  description:
    "Fetch two to four listings side by side by id, for comparing rent, size, and amenities.",
  parameters: {
    type: "object",
    properties: {
      ids: {
        type: "array",
        items: { type: "string" },
        description: "2 to 4 listing ids to compare.",
      },
    },
    required: ["ids"],
  },
};

export const estimateCommuteTool: ToolDefinition = {
  name: "estimate_commute",
  description:
    "Estimate straight-line distance and a rough drive time between a Nairobi neighborhood and a work area. " +
    "This is an approximation based on area centroids, not live traffic routing — say so when you use it.",
  parameters: {
    type: "object",
    properties: {
      neighborhood: { type: "string", description: "The listing's neighborhood." },
      work_area: { type: "string", description: "Where the renter works or wants to be near." },
    },
    required: ["neighborhood", "work_area"],
  },
};

export const getComparableListingsTool: ToolDefinition = {
  name: "get_comparable_listings",
  description:
    "Fetch recent rent figures for similar listings (same neighborhood/type/bedroom count) to ground a price suggestion in real market data.",
  parameters: {
    type: "object",
    properties: {
      neighborhood: { type: "string" },
      type: { type: "string" },
      bedrooms: { type: "number" },
    },
    required: ["neighborhood"],
  },
};

export function toolsForMode(mode: AssistantMode): ToolDefinition[] {
  switch (mode) {
    case "tenant":
      return [searchListingsTool, getListingTool, compareListingsTool, estimateCommuteTool];
    case "landlord_price":
      return [getComparableListingsTool];
    case "landlord_description":
      return [];
  }
}
