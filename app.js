import express from "express";
import cors from "cors";
import routes from "./src/routes/index.js";
import { notFound, errorHandler } from "./src/middleware/errorHandler.js";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || true,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", routes);

app.use(notFound);
app.use(errorHandler);

export default app;
