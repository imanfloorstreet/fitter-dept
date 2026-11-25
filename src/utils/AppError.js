// Error with an HTTP status code, thrown from services and read by controllers
export default class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}
