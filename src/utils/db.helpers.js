import AppError from "./AppError.js";

/**
 * Builds a partial UPDATE from only the fields provided.
 * fieldMap (camelCase key -> snake_case column) doubles as a whitelist.
 */
export const buildUpdate = (table, id, data, fieldMap) => {
  const entries = Object.entries(data || {}).filter(
    ([key, value]) => key in fieldMap && value !== undefined
  );
  if (entries.length === 0) return null;

  const setClause = entries.map(([key]) => `${fieldMap[key]} = @${key}`).join(", ");

  return {
    sql: `UPDATE ${table} SET ${setClause}, updated_at = datetime('now') WHERE id = @id`,
    params: { ...Object.fromEntries(entries), id },
  };
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const validateDate = (date) => {
  if (typeof date !== "string" || !DATE_RE.test(date) || Number.isNaN(Date.parse(date))) {
    throw new AppError(`Invalid date "${date}". Use YYYY-MM-DD.`);
  }
};

export const validateDates = (dates) => {
  if (!Array.isArray(dates) || dates.length === 0) {
    throw new AppError("dates must be a non-empty array of YYYY-MM-DD strings");
  }
  dates.forEach(validateDate);
};

// Turns SQLite constraint errors into readable API errors
export const mapDbError = (error) => {
  if (error instanceof AppError) return error;
  if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
    return new AppError("A record with this value already exists", 409);
  }
  if (error.code === "SQLITE_CONSTRAINT_FOREIGNKEY") {
    return new AppError("Referenced fitter does not exist", 400);
  }
  return error;
};
