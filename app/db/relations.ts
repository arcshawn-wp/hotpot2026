import { relations } from "drizzle-orm";
import { hotspots, platformDiscussions } from "./schema";

export const hotspotsRelations = relations(hotspots, ({ many }) => ({
  discussions: many(platformDiscussions),
}));
