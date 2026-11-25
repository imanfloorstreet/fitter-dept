import crypto from "crypto";
import multer from "multer";
import AppError from "../utils/AppError.js";
import { sendError } from "../utils/response.js";
import { JOB_IMAGE_DIR, MAX_IMAGES_PER_JOB } from "../utils/jobImages.js";

const MAX_FILE_SIZE_MB = 5;

// Allowed image types and the extension each one is saved with
const ALLOWED_TYPES = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, JOB_IMAGE_DIR),
  // Random name so uploads never overwrite each other and the original name isn't trusted
  filename: (req, file, cb) =>
    cb(null, `${Date.now()}-${crypto.randomUUID()}${ALLOWED_TYPES[file.mimetype]}`),
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024, files: MAX_IMAGES_PER_JOB },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_TYPES[file.mimetype]) return cb(null, true);
    cb(new AppError(`Unsupported image type for "${file.originalname}". Use JPG, PNG, WEBP or GIF.`));
  },
});

const MULTER_MESSAGES = {
  LIMIT_FILE_SIZE: `Each image must be ${MAX_FILE_SIZE_MB} MB or smaller`,
  LIMIT_FILE_COUNT: `You can upload up to ${MAX_IMAGES_PER_JOB} images at a time`,
  LIMIT_UNEXPECTED_FILE: 'Images must be sent in the "images" field',
};

/**
 * Accepts up to MAX_IMAGES_PER_JOB files in the "images" form field.
 * Saved files are available as req.files. Requests that aren't
 * multipart/form-data pass straight through, so plain JSON still works.
 */
export const uploadJobImages = (req, res, next) => {
  upload.array("images", MAX_IMAGES_PER_JOB)(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      return sendError(res, new AppError(MULTER_MESSAGES[err.code] || err.message));
    }
    return sendError(res, err);
  });
};