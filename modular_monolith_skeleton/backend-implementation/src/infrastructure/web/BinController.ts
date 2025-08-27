import { Router } from "express";
import { validate, createBinSchema } from "../../shared/validation/schemas";
import { CreateBin } from "../../application/bin/use-cases/CreateBin";
import { BinRepoSequelize } from "../db/BinRepoSequelize";

export const binRouter = Router();
const createBin = new CreateBin(new BinRepoSequelize());

// Example auth subject extraction (replace with real auth middleware)
function subjectFrom(req: any){ return { id: req.user?.id ?? "system", roles: req.user?.roles ?? ["admin"] }; }

binRouter.post("/bins", validate(createBinSchema), async (req, res, next) => {
  try {
    const out = await createBin.execute(req.validated, subjectFrom(req));
    res.status(201).json(out);
  } catch (e) { next(e); }
});
