import express from "express";
import { authRouter } from "./AuthController";
import { binRouter } from "./BinController";
import { bffRouter } from "../../bff/handlers";
import { errorMiddleware } from "../../shared/errors";

export function buildApp(){
  const app = express();
  app.use(express.json());
  app.use("/auth", authRouter);
  app.use("/ops", binRouter);
  app.use("/bff", bffRouter);
  app.use(errorMiddleware);
  return app;
}

// If you want a standalone server for local test:
// const app = buildApp();
// app.listen(8080, () => console.log("API on :8080"));
