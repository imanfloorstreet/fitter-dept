export const sendError = (res, error) => {
  const status = error.statusCode || 500;
  if (status === 500) console.error(error);
  res.status(status).send({ message: error.message || "Something went wrong" });
};
