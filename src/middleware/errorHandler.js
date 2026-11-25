export const notFound = (req, res) => {
  res.status(404).send({ message: `Route not found: ${req.method} ${req.originalUrl}` });
};

// Catches anything that slips past the controllers (e.g. bad JSON body)
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  const status = err.statusCode || err.status || 500;
  if (status === 500) console.error(err);
  res.status(status).send({ message: err.message || "Internal server error" });
};
