import * as fitterService from "../services/fitter.service.js";
import { sendError } from "../utils/response.js";

export const getAllFitters = async (req, res) => {
  try {
    const response = await fitterService.getAllFitters(req.query);
    res.send({ data: response });
  } catch (error) {
    sendError(res, error);
  }
};

export const getFitterById = async (req, res) => {
  try {
    const response = await fitterService.getFitterById(req.params.id);
    res.send({ data: response });
  } catch (error) {
    sendError(res, error);
  }
};

export const createFitter = async (req, res) => {
  try {
    const response = await fitterService.createFitter(req.body);
    res.status(201).send({ data: response });
  } catch (error) {
    sendError(res, error);
  }
};

export const updateFitter = async (req, res) => {
  try {
    const response = await fitterService.updateFitter(req.params.id, req.body);
    res.send({ data: response });
  } catch (error) {
    sendError(res, error);
  }
};

export const deleteFitter = async (req, res) => {
  try {
    const response = await fitterService.deleteFitter(req.params.id);
    res.send({ data: response });
  } catch (error) {
    sendError(res, error);
  }
};
