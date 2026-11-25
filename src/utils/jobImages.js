import fs from "fs";
import path from "path";

// Files live in <project>/uploads/jobs and are served at /uploads/jobs/<file>
export const JOB_IMAGE_DIR = path.resolve(process.cwd(), "uploads", "jobs");
export const JOB_IMAGE_URL_PREFIX = "/uploads/jobs/";
export const MAX_IMAGES_PER_JOB = 20;

fs.mkdirSync(JOB_IMAGE_DIR, { recursive: true });

// The reference stored on the job and returned by the API
export const toImageRef = (file) => `${JOB_IMAGE_URL_PREFIX}${file.filename}`;

// Only references that point at a file directly inside JOB_IMAGE_DIR are accepted,
// so a bad reference can never delete anything else on disk
const refToPath = (ref) => {
  if (typeof ref !== "string" || !ref.startsWith(JOB_IMAGE_URL_PREFIX)) return null;
  const name = ref.slice(JOB_IMAGE_URL_PREFIX.length);
  if (!name || name !== path.basename(name)) return null;
  return path.join(JOB_IMAGE_DIR, name);
};

const removeFile = (filePath) => {
  try {
    fs.rmSync(filePath, { force: true });
  } catch (err) {
    console.error(`Could not delete image file ${filePath}:`, err.message);
  }
};

// Delete stored images by their references (e.g. when a job is deleted)
export const deleteImageFiles = (refs = []) => {
  refs.forEach((ref) => {
    const filePath = refToPath(ref);
    if (filePath) removeFile(filePath);
  });
};

// Delete files multer just saved (e.g. when creating the job failed validation)
export const deleteUploadedFiles = (files = []) => {
  files.forEach((file) => {
    if (file?.path) removeFile(file.path);
  });
};