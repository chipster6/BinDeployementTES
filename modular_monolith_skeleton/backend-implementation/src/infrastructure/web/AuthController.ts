import { Router } from "express";
import { validate, loginSchema } from "../../shared/validation/schemas";
import { Login } from "../../application/auth/use-cases/Login";
import { AuthRepoSequelize } from "../db/AuthRepoSequelize";

export const authRouter = Router();
const login = new Login(new AuthRepoSequelize());

authRouter.post("/login", validate(loginSchema), async (req, res, next) => {
  try {
    const out = await login.execute(req.validated);
    res.status(200).json(out);
  } catch (e) { next(e); }
});
