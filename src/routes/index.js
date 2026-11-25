import express from "express";
import fitterRoutes from "./fitter.routes.js";
import fitterDatesRoutes from "./fitterDates.routes.js";
import jobRoutes from "./job.routes.js";

const router = express.Router();

router.get("/health", (req, res) => res.send({ status: "ok" }));

router.use("/fitter", fitterRoutes);
router.use("/fitter-dates", fitterDatesRoutes);
router.use("/job", jobRoutes);

export default router;
