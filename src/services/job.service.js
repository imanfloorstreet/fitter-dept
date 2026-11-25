import db from "../config/db.js";
import AppError from "../utils/AppError.js";
import { getFitterById } from "./fitter.service.js";
import { buildUpdate, mapDbError } from "../utils/db.helpers.js";
import {
  MAX_IMAGES_PER_JOB,
  toImageRef,
  deleteImageFiles,
  deleteUploadedFiles,
} from "../utils/jobImages.js";

const SELECT_JOB = `
  SELECT j.id, j.fitter_id AS fitterId, f.name AS fitterName,
         j.cm_name AS cmName, j.cm_email AS cmEmail,
         j.fst_sample_order AS fstSampleOrder, j.description, j.quote,
         j.booking_fee AS bookingFee, j.days_needed AS daysNeeded,
         j.confirmed_dates AS confirmedDates, j.draft_order_id AS draftOrderId,
         j.images, j.status,
         j.created_at AS createdAt, j.updated_at AS updatedAt
  FROM jobs j
  LEFT JOIN fitters f ON f.id = j.fitter_id
`;

const FIELD_MAP = {
  fitterId: "fitter_id",
  cmName: "cm_name",
  cmEmail: "cm_email",
  fstSampleOrder: "fst_sample_order",
  description: "description",
  quote: "quote",
  bookingFee: "booking_fee",
  daysNeeded: "days_needed",
  confirmedDates: "confirmed_dates",
  draftOrderId: "draft_order_id",
  images: "images",
  status: "status",
};

// Fields a client may set in the request body. Images are excluded on purpose:
// they can only be added by uploading files, so nobody can point a job at an
// arbitrary path on the server.
const INPUT_FIELDS = Object.keys(FIELD_MAP).filter((key) => key !== "images");

const DEFAULT_STATUS = "INITIAL";

// The only fields a new job can be created with (images arrive as uploaded files).
// Everything else is set later: fitter via /assign, dates and draft order via
// /confirmation, status via /status, and quote / booking fee / days needed via PUT.
const CREATE_FIELDS = ["cmName", "cmEmail", "fstSampleOrder", "description"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Prepared once at startup instead of on every call
const stmts = {
  getById: db.prepare(`${SELECT_JOB} WHERE j.id = ?`),
  insert: db.prepare(`
    INSERT INTO jobs (fitter_id, cm_name, cm_email, fst_sample_order, description, quote,
                      booking_fee, days_needed, confirmed_dates, draft_order_id, images, status)
    VALUES (@fitterId, @cmName, @cmEmail, @fstSampleOrder, @description, @quote,
            @bookingFee, @daysNeeded, @confirmedDates, @draftOrderId, @images, @status)
  `),
  delete: db.prepare("DELETE FROM jobs WHERE id = ?"),
  // Which of the given dates (passed as a JSON array) is the fitter unavailable on?
  unavailableOn: db.prepare(`
    SELECT unavailable_date AS date FROM fitter_dates
    WHERE fitter_id = ? AND unavailable_date IN (SELECT value FROM json_each(?))
    ORDER BY unavailable_date
  `),
};

// ---------- helpers ----------

// Array fields are stored as JSON text; the API always returns arrays
const JSON_ARRAY_FIELDS = ["confirmedDates", "images"];

const parseJsonArray = (value) => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const toJob = (row) => {
  if (!row) return row;
  const job = { ...row };
  JSON_ARRAY_FIELDS.forEach((field) => {
    job[field] = parseJsonArray(row[field]);
  });
  return job;
};

// Multipart form fields always arrive as strings, so "null" means null
const fromFormValue = (value) =>
  typeof value === "string" && value.trim().toLowerCase() === "null" ? null : value;

// Accepts an array, a JSON array string ('["2026-12-10"]') or a comma-separated
// string ("2026-12-10,2026-12-11"), so it works for both JSON and form-data
const toList = (value, field) => {
  if (typeof value !== "string") return value;
  const text = value.trim();
  if (!text) return null;
  if (text.startsWith("[")) {
    try {
      return JSON.parse(text);
    } catch {
      throw new AppError(`${field} must be a JSON array or a comma-separated list`);
    }
  }
  return text.split(",").map((item) => item.trim()).filter(Boolean);
};

// Strict: rejects dates like 2026-02-30 that JS would silently roll over
const isValidDate = (value) => {
  if (typeof value !== "string" || !DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
};

const normalizeConfirmedDates = (value) => {
  const dates = toList(value, "confirmedDates");
  if (dates === null) return null;
  if (!Array.isArray(dates)) {
    throw new AppError("confirmedDates must be an array of YYYY-MM-DD dates");
  }
  const invalid = dates.filter((d) => !isValidDate(d));
  if (invalid.length) {
    throw new AppError(`Invalid confirmedDates: ${invalid.join(", ")}. Use YYYY-MM-DD.`);
  }
  return [...new Set(dates)].sort(); // remove duplicates, keep in order
};

const toNonNegativeNumber = (value, field) => {
  const n = Number(value);
  if (value === null || value === "" || Number.isNaN(n) || n < 0) {
    throw new AppError(`${field} must be a number >= 0`);
  }
  return Math.round(n * 100) / 100;
};

// Optional text: trimmed, and empty becomes null
const toOptionalText = (value, field) => {
  if (value === null) return null;
  if (typeof value !== "string" && typeof value !== "number") {
    throw new AppError(`${field} must be text`);
  }
  return String(value).trim() || null;
};

const normalizeStatus = (value) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new AppError("status must be a non-empty string");
  }
  return value.trim().toUpperCase();
};

/**
 * Validates input and converts it to clean values.
 * Only fields that were actually sent are returned, so this works for
 * both create and partial updates.
 */
const prepareJobData = (data = {}) => {
  const out = {};
  INPUT_FIELDS.forEach((key) => {
    if (data[key] !== undefined) out[key] = fromFormValue(data[key]);
  });

  if (out.cmName !== undefined) {
    if (typeof out.cmName !== "string" || !out.cmName.trim()) {
      throw new AppError("cmName is required");
    }
    out.cmName = out.cmName.trim();
  }
  if (out.cmEmail !== undefined) {
    out.cmEmail = out.cmEmail === null ? null : String(out.cmEmail).trim().toLowerCase() || null;
    if (out.cmEmail && !EMAIL_RE.test(out.cmEmail)) {
      throw new AppError("cmEmail must be a valid email");
    }
  }
  if (out.fstSampleOrder !== undefined) {
    out.fstSampleOrder = toOptionalText(out.fstSampleOrder, "fstSampleOrder");
  }
  if (out.description !== undefined) {
    out.description = toOptionalText(out.description, "description");
  }
  if (out.quote !== undefined) out.quote = toNonNegativeNumber(out.quote, "quote");
  if (out.bookingFee !== undefined) out.bookingFee = toNonNegativeNumber(out.bookingFee, "bookingFee");
  if (out.daysNeeded !== undefined) {
    const days = Number(out.daysNeeded);
    if (!Number.isInteger(days) || days < 1) {
      throw new AppError("daysNeeded must be a whole number >= 1");
    }
    out.daysNeeded = days;
  }
  if (out.fitterId !== undefined) {
    out.fitterId =
      out.fitterId === null || out.fitterId === ""
        ? null
        : getFitterById(out.fitterId).id; // 404 if the fitter doesn't exist
  }
  if (out.confirmedDates !== undefined) {
    out.confirmedDates = normalizeConfirmedDates(out.confirmedDates);
  }
  if (out.draftOrderId !== undefined && out.draftOrderId !== null) {
    // Stored as text: order IDs can be too large for JS numbers, or strings like "gid://..."
    out.draftOrderId = String(out.draftOrderId).trim() || null;
  }
  if (out.status !== undefined) {
    out.status = normalizeStatus(out.status);
  }

  return out;
};

// Rules that depend on the job's final state (existing values + changes)
const assertConfirmedDatesValid = (job) => {
  const dates = job.confirmedDates || [];
  if (!dates.length) return;

  if (dates.length > job.daysNeeded) {
    throw new AppError(
      `Job needs ${job.daysNeeded} day(s) but ${dates.length} confirmed dates were given`
    );
  }
  if (job.fitterId) {
    const blocked = stmts.unavailableOn.all(job.fitterId, JSON.stringify(dates)).map((r) => r.date);
    if (blocked.length) {
      throw new AppError(`Fitter is unavailable on: ${blocked.join(", ")}`, 409);
    }
  }
};

// Arrays can't be bound to SQLite, so store them as JSON text
const toDbParams = (data) => {
  const params = { ...data };
  JSON_ARRAY_FIELDS.forEach((field) => {
    if (params[field] !== undefined) {
      params[field] = params[field] && params[field].length ? JSON.stringify(params[field]) : null;
    }
  });
  return params;
};

const saveImages = (jobId, images) => {
  const query = buildUpdate("jobs", jobId, toDbParams({ images }), FIELD_MAP);
  db.prepare(query.sql).run(query.params);
};

// ---------- queries ----------

export const getAllJobs = (query = {}) => {
  const { status, fitterId } = query;
  const where = [];
  const params = {};

  if (status) {
    where.push("j.status = @status");
    params.status = String(status).trim().toUpperCase();
  }
  if (fitterId) {
    where.push("j.fitter_id = @fitterId");
    params.fitterId = fitterId;
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  return db
    .prepare(`${SELECT_JOB} ${whereSql} ORDER BY j.created_at DESC, j.id DESC`)
    .all(params)
    .map(toJob);
};

export const getJobsByFitter = (fitterId) => {
  const fitter = getFitterById(fitterId);
  return getAllJobs({ fitterId: fitter.id });
};

export const getJobById = (id) => {
  const job = toJob(stmts.getById.get(id));
  if (!job) throw new AppError("Job not found", 404);
  return job;
};

// ---------- mutations ----------

/**
 * Creates a job with only cmName (required), cmEmail, fstSampleOrder,
 * description and images. `files` are the images multer saved from the
 * "images" field. Any other field is rejected with a 400.
 * If anything fails, the uploaded files are deleted so no orphans are left on disk.
 */
export const createJob = (dataParams = {}, files = []) => {
  try {
    const body = dataParams || {};

    if (body.images !== undefined) {
      throw new AppError('images must be uploaded as files in the "images" field');
    }
    const notAllowed = Object.keys(body).filter((key) => !CREATE_FIELDS.includes(key));
    if (notAllowed.length) {
      throw new AppError(
        `These fields can't be set when creating a job: ${notAllowed.join(", ")}. ` +
          `Allowed: ${CREATE_FIELDS.join(", ")}, images.`
      );
    }

    const data = prepareJobData(body);
    if (!data.cmName) throw new AppError("cmName is required");

    const images = files.map(toImageRef);
    if (images.length > MAX_IMAGES_PER_JOB) {
      throw new AppError(`A job can have at most ${MAX_IMAGES_PER_JOB} images`);
    }

    // Everything outside CREATE_FIELDS starts at its default
    const job = {
      fitterId: null,
      cmEmail: null,
      fstSampleOrder: null,
      description: null,
      quote: 0,
      bookingFee: 0,
      daysNeeded: 1,
      confirmedDates: null,
      draftOrderId: null,
      status: DEFAULT_STATUS,
      ...data,
      images,
    };

    // created_at / updated_at are filled in by the database defaults
    const { lastInsertRowid } = stmts.insert.run(toDbParams(job));
    return getJobById(lastInsertRowid);
  } catch (e) {
    deleteUploadedFiles(files);
    throw mapDbError(e);
  }
};

// General partial update: send only the fields you want to change.
// Images are managed through addJobImages / removeJobImages instead.
export const updateJob = (id, dataParams) => {
  try {
    const existing = getJobById(id);
    const changes = prepareJobData(dataParams);
    if (Object.keys(changes).length === 0) throw new AppError("No valid fields to update");

    // Re-check dates whenever something they depend on changes
    if ("confirmedDates" in changes || "fitterId" in changes || "daysNeeded" in changes) {
      assertConfirmedDatesValid({ ...existing, ...changes });
    }

    const query = buildUpdate("jobs", existing.id, toDbParams(changes), FIELD_MAP);
    db.prepare(query.sql).run(query.params);
    return getJobById(existing.id);
  } catch (e) {
    throw mapDbError(e);
  }
};

/**
 * Updates only the booking confirmation part of a job.
 * Body: { confirmedDates: ["2026-12-10", "2026-12-11"], draftOrderId: "1234567890" }
 * Either field can be sent on its own; send null to clear one.
 */
export const updateJobConfirmation = (id, dataParams) => {
  const { confirmedDates, draftOrderId } = dataParams || {};
  if (confirmedDates === undefined && draftOrderId === undefined) {
    throw new AppError("confirmedDates or draftOrderId is required");
  }
  return updateJob(id, { confirmedDates, draftOrderId });
};

// Adds newly uploaded images to the end of the job's image list
export const addJobImages = (id, files = []) => {
  try {
    if (!files.length) throw new AppError('Upload at least one image in the "images" field');

    const job = getJobById(id);
    const images = [...job.images, ...files.map(toImageRef)];
    if (images.length > MAX_IMAGES_PER_JOB) {
      throw new AppError(
        `A job can have at most ${MAX_IMAGES_PER_JOB} images (this job already has ${job.images.length})`
      );
    }

    saveImages(job.id, images);
    return getJobById(job.id);
  } catch (e) {
    deleteUploadedFiles(files);
    throw mapDbError(e);
  }
};

/**
 * Removes images from a job and deletes the files.
 * Body: { images: ["/uploads/jobs/1764000000000-abc.jpg"] }  (or a single string)
 */
export const removeJobImages = (id, dataParams) => {
  try {
    const job = getJobById(id);
    const raw = toList(dataParams?.images, "images");
    const toRemove = [...new Set((Array.isArray(raw) ? raw : []).map(String))];
    if (!toRemove.length) throw new AppError("images is required: the references to remove");

    const unknown = toRemove.filter((ref) => !job.images.includes(ref));
    if (unknown.length) {
      throw new AppError(`These images don't belong to this job: ${unknown.join(", ")}`);
    }

    saveImages(job.id, job.images.filter((ref) => !toRemove.includes(ref)));
    deleteImageFiles(toRemove); // only after the database no longer references them
    return getJobById(job.id);
  } catch (e) {
    throw mapDbError(e);
  }
};

export const updateJobStatus = (id, dataParams) => {
  const { status } = dataParams || {};
  if (!status) throw new AppError("status is required");
  return updateJob(id, { status });
};

// Send { fitterId: null } to unassign
export const assignJobToFitter = (id, dataParams) => {
  const { fitterId } = dataParams || {};
  if (fitterId === undefined) throw new AppError("fitterId is required (or null to unassign)");
  return updateJob(id, { fitterId });
};

export const deleteJob = (id) => {
  const job = getJobById(id);
  stmts.delete.run(job.id);
  deleteImageFiles(job.images);
  return { message: "Job deleted successfully!" };
};