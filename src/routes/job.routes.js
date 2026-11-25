import express from "express";
import asyncHandler from "express-async-handler";
import * as jobController from "../controllers/job.controller.js";
import { uploadJobImages } from "../middleware/upload.middleware.js";

const router = express.Router();

// GET /api/job?status=INITIAL&fitterId=1
router.get(
  "/",
  asyncHandler(async (req, res) => {
    return jobController.getAllJobs(req, res);
  })
);

router.get(
  "/fitter/:fitterId",
  asyncHandler(async (req, res) => {
    return jobController.getJobsByFitter(req, res);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    return jobController.getJobById(req, res);
  })
);

// multipart/form-data: cmName (required), cmEmail, fstSampleOrder, description + files in "images"
// (JSON without images also works). Other fields are set later through the routes below.
router.post(
  "/",
  uploadJobImages,
  asyncHandler(async (req, res) => {
    return jobController.createJob(req, res);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    return jobController.updateJob(req, res);
  })
);

router.patch(
  "/:id/status",
  asyncHandler(async (req, res) => {
    return jobController.updateJobStatus(req, res);
  })
);

router.patch(
  "/:id/assign",
  asyncHandler(async (req, res) => {
    return jobController.assignJobToFitter(req, res);
  })
);

// body: { "confirmedDates": ["2026-12-10", "2026-12-11"], "draftOrderId": "1234567890" }
router.patch(
  "/:id/confirmation",
  asyncHandler(async (req, res) => {
    return jobController.updateJobConfirmation(req, res);
  })
);

// multipart/form-data: files in "images" are added to the job
router.post(
  "/:id/images",
  uploadJobImages,
  asyncHandler(async (req, res) => {
    return jobController.addJobImages(req, res);
  })
);

// body: { "images": ["/uploads/jobs/1764000000000-abc.jpg"] }
router.delete(
  "/:id/images",
  asyncHandler(async (req, res) => {
    return jobController.removeJobImages(req, res);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    return jobController.deleteJob(req, res);
  })
);

export default router;