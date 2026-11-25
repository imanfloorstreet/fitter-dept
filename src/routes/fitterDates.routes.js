import express from "express";
import asyncHandler from "express-async-handler";
import * as fitterDatesController from "../controllers/fitterDates.controller.js";

const router = express.Router();

// GET /api/fitter-dates/available?date=2026-12-01  (must stay above /:fitterId)
router.get(
  "/available",
  asyncHandler(async (req, res) => {
    return fitterDatesController.getAvailableFitters(req, res);
  })
);

router.get(
  "/:fitterId",
  asyncHandler(async (req, res) => {
    return fitterDatesController.getUnavailableDates(req, res);
  })
);

// GET /api/fitter-dates/:fitterId/check?date=2026-12-01
router.get(
  "/:fitterId/check",
  asyncHandler(async (req, res) => {
    return fitterDatesController.checkFitterAvailability(req, res);
  })
);

// body: { "dates": ["2026-12-01", "2026-12-02"] }
router.post(
  "/:fitterId",
  asyncHandler(async (req, res) => {
    return fitterDatesController.addUnavailableDates(req, res);
  })
);

router.put(
  "/:fitterId",
  asyncHandler(async (req, res) => {
    return fitterDatesController.setUnavailableDates(req, res);
  })
);

router.delete(
  "/:fitterId",
  asyncHandler(async (req, res) => {
    return fitterDatesController.removeUnavailableDates(req, res);
  })
);

export default router;
