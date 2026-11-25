import * as jobService from "../services/job.service.js";
import { sendError } from "../utils/response.js";

export const getAllJobs = async (req, res) => {
  try {
    const response = await jobService.getAllJobs(req.query);
    res.send({ data: response });
  } catch (error) {
    sendError(res, error);
  }
};

export const getJobsByFitter = async (req, res) => {
  try {
    const response = await jobService.getJobsByFitter(req.params.fitterId);
    res.send({ data: response });
  } catch (error) {
    sendError(res, error);
  }
};

export const getJobById = async (req, res) => {
  try {
    const response = await jobService.getJobById(req.params.id);
    res.send({ data: response });
  } catch (error) {
    sendError(res, error);
  }
};

// Accepts JSON, or multipart/form-data with files in the "images" field
export const createJob = async (req, res) => {
  try {
    const response = await jobService.createJob(req.body, req.files || []);
    res.status(201).send({ data: response });
  } catch (error) {
    sendError(res, error);
  }
};

export const updateJob = async (req, res) => {
  try {
    const response = await jobService.updateJob(req.params.id, req.body);
    res.send({ data: response });
  } catch (error) {
    sendError(res, error);
  }
};

export const updateJobStatus = async (req, res) => {
  try {
    const response = await jobService.updateJobStatus(req.params.id, req.body);
    res.send({ data: response });
  } catch (error) {
    sendError(res, error);
  }
};

export const assignJobToFitter = async (req, res) => {
  try {
    const response = await jobService.assignJobToFitter(req.params.id, req.body);
    res.send({ data: response });
  } catch (error) {
    sendError(res, error);
  }
};

export const updateJobConfirmation = async (req, res) => {
  try {
    const response = await jobService.updateJobConfirmation(req.params.id, req.body);
    res.send({ data: response });
  } catch (error) {
    sendError(res, error);
  }
};

export const addJobImages = async (req, res) => {
  try {
    const response = await jobService.addJobImages(req.params.id, req.files || []);
    res.send({ data: response });
  } catch (error) {
    sendError(res, error);
  }
};

export const removeJobImages = async (req, res) => {
  try {
    const response = await jobService.removeJobImages(req.params.id, req.body);
    res.send({ data: response });
  } catch (error) {
    sendError(res, error);
  }
};

export const deleteJob = async (req, res) => {
  try {
    const response = await jobService.deleteJob(req.params.id);
    res.send({ data: response });
  } catch (error) {
    sendError(res, error);
  }
};