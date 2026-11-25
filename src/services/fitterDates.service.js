import db from "../config/db.js";
import AppError from "../utils/AppError.js";
import { getFitterById } from "./fitter.service.js";
import { validateDate, validateDates } from "../utils/db.helpers.js";

const insertDate = db.prepare(
  "INSERT OR IGNORE INTO fitter_dates (fitter_id, unavailable_date) VALUES (?, ?)"
);
const deleteDate = db.prepare(
  "DELETE FROM fitter_dates WHERE fitter_id = ? AND unavailable_date = ?"
);
const clearDates = db.prepare("DELETE FROM fitter_dates WHERE fitter_id = ?");

const listDates = (fitterId) =>
  db
    .prepare(
      "SELECT unavailable_date FROM fitter_dates WHERE fitter_id = ? ORDER BY unavailable_date"
    )
    .all(fitterId)
    .map((row) => row.unavailable_date);

const formatResult = (fitterId) => ({
  fitterId: Number(fitterId),
  unavailableDates: listDates(fitterId),
});

export const getUnavailableDates = (fitterId) => {
  getFitterById(fitterId);
  return formatResult(fitterId);
};

// Adds dates to the existing list (duplicates ignored)
export const addUnavailableDates = (fitterId, dataParams) => {
  const { dates } = dataParams || {};
  getFitterById(fitterId);
  validateDates(dates);

  db.transaction(() => {
    dates.forEach((date) => insertDate.run(fitterId, date));
  })();

  return formatResult(fitterId);
};

// Replaces the whole list (send [] to clear everything)
export const setUnavailableDates = (fitterId, dataParams) => {
  const { dates } = dataParams || {};
  getFitterById(fitterId);
  if (!Array.isArray(dates)) throw new AppError("dates must be an array of YYYY-MM-DD strings");
  dates.forEach(validateDate);

  db.transaction(() => {
    clearDates.run(fitterId);
    dates.forEach((date) => insertDate.run(fitterId, date));
  })();

  return formatResult(fitterId);
};

export const removeUnavailableDates = (fitterId, dataParams) => {
  const { dates } = dataParams || {};
  getFitterById(fitterId);
  validateDates(dates);

  db.transaction(() => {
    dates.forEach((date) => deleteDate.run(fitterId, date));
  })();

  return formatResult(fitterId);
};

export const checkFitterAvailability = (fitterId, date) => {
  getFitterById(fitterId);
  validateDate(date);

  const blocked = db
    .prepare("SELECT 1 FROM fitter_dates WHERE fitter_id = ? AND unavailable_date = ?")
    .get(fitterId, date);

  return { fitterId: Number(fitterId), date, available: !blocked };
};

// Active fitters who are free on a given date
export const getAvailableFitters = (date) => {
  validateDate(date);
  return db
    .prepare(
      `SELECT f.id, f.name, f.business_name AS businessName, f.email, f.mobile
       FROM fitters f
       WHERE f.status = 'active'
         AND NOT EXISTS (
           SELECT 1 FROM fitter_dates d
           WHERE d.fitter_id = f.id AND d.unavailable_date = ?
         )
       ORDER BY f.name`
    )
    .all(date);
};
