import { z } from "zod";

export const incidentSearchSchema = z.object({
  query: z.string().min(1),
});
