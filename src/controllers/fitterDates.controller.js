import * as fitterDatesService from "../services/fitterDates.service.js";
import { sendError } from "../utils/response.js";

export const getAvailableFitters = async (req, res) => {
  try {
    const response = await fitterDatesService.getAvailableFitters(req.query.date);
    res.send({ data: response });
  } catch (error) {
    sendError(res, error);
  }
};

export const getUnavailableDates = async (req, res) => {
  try {
    const response = await fitterDatesService.getUnavailableDates(req.params.fitterId);
    res.send({ data: response });
  } catch (error) {
    sendError(res, error);
  }
};

export const checkFitterAvailability = async (req, res) => {
  try {
    const response = await fitterDatesService.checkFitterAvailability(
      req.params.fitterId,
      req.query.date
    );
    res.send({ data: response });
  } catch (error) {
    sendError(res, error);
  }
};

export const addUnavailableDates = async (req, res) => {
  try {
    const response = await fitterDatesService.addUnavailableDates(req.params.fitterId, req.body);
    res.send({ data: response });
  } catch (error) {
    sendError(res, error);
  }
};

export const setUnavailableDates = async (req, res) => {
  try {
    const response = await fitterDatesService.setUnavailableDates(req.params.fitterId, req.body);
    res.send({ data: response });
  } catch (error) {
    sendError(res, error);
  }
};

export const removeUnavailableDates = async (req, res) => {
  try {
    const response = await fitterDatesService.removeUnavailableDates(req.params.fitterId, req.body);
    res.send({ data: response });
  } catch (error) {
    sendError(res, error);
  }
};
