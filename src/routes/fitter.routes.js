import express from "express";
import asyncHandler from "express-async-handler";
import * as fitterController from "../controllers/fitter.controller.js";

const router = express.Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    return fitterController.getAllFitters(req, res);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    return fitterController.getFitterById(req, res);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    return fitterController.createFitter(req, res);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    return fitterController.updateFitter(req, res);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    return fitterController.deleteFitter(req, res);
  })
);

export default router;
