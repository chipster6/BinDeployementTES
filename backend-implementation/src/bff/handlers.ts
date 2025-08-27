import { Router } from "express";
// In monolith, call application layer directly; later, swap to HTTP calls.
export const bffRouter = Router();
bffRouter.get("/dashboard/ops-kpis", async (_req, res) => {
  // TODO: wire to ops + analytics read models
  res.json({ binsCount: 0, dossier: { pickups: 0, avgFillBeforePickup: 0 } });
});
