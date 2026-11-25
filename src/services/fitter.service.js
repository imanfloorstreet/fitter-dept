import db from "../config/db.js";
import AppError from "../utils/AppError.js";
import { buildUpdate, mapDbError } from "../utils/db.helpers.js";

const SELECT_FITTER = `
  SELECT id, name, business_name AS businessName, email, address, mobile, status,
         created_at AS createdAt, updated_at AS updatedAt
  FROM fitters
`;

const FIELD_MAP = {
  name: "name",
  businessName: "business_name",
  email: "email",
  address: "address",
  mobile: "mobile",
  status: "status",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const getAllFitters = (query = {}) => {
  const { status } = query;
  if (status) {
    return db.prepare(`${SELECT_FITTER} WHERE status = ? ORDER BY name`).all(status);
  }
  return db.prepare(`${SELECT_FITTER} ORDER BY name`).all();
};

export const getFitterById = (id) => {
  const fitter = db.prepare(`${SELECT_FITTER} WHERE id = ?`).get(id);
  if (!fitter) throw new AppError("Fitter not found", 404);
  return fitter;
};

export const createFitter = (dataParams) => {
  try {
    const {
      name,
      businessName = null,
      email,
      address = null,
      mobile = null,
      status = "active",
    } = dataParams || {};

    if (!name || !email) throw new AppError("name and email are required");
    if (!EMAIL_RE.test(email)) throw new AppError("Invalid email address");

    const { lastInsertRowid } = db
      .prepare(
        `INSERT INTO fitters (name, business_name, email, address, mobile, status)
         VALUES (@name, @businessName, @email, @address, @mobile, @status)`
      )
      .run({ name, businessName, email, address, mobile, status });

    return getFitterById(lastInsertRowid);
  } catch (e) {
    throw mapDbError(e);
  }
};

export const updateFitter = (id, dataParams) => {
  try {
    getFitterById(id); // 404 if missing

    if (dataParams?.email !== undefined && !EMAIL_RE.test(dataParams.email)) {
      throw new AppError("Invalid email address");
    }

    const query = buildUpdate("fitters", id, dataParams, FIELD_MAP);
    if (!query) throw new AppError("No valid fields to update");

    db.prepare(query.sql).run(query.params);
    return getFitterById(id);
  } catch (e) {
    throw mapDbError(e);
  }
};

// Unavailable dates are removed (CASCADE); their jobs are kept with fitterId = null
export const deleteFitter = (id) => {
  getFitterById(id);
  db.prepare("DELETE FROM fitters WHERE id = ?").run(id);
  return { message: "Fitter deleted successfully!" };
};
