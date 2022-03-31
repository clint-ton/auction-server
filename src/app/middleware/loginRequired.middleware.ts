import { Request, Response } from "express";
import Logger from "../../config/logger";
import { findUserIdByToken } from "../models/users.model";

export default async (req: Request, res: Response, next: () => void) => {
  const token = req.header("X-Authorization");
  if (token === undefined || token === null) {
    res.statusMessage = "Unauthorized";
    res.status(401).send();
    return;
  }
  try {
    const result = await findUserIdByToken(token);
    if (result.length === 0) {
      res.statusMessage = "Unauthorized";
      res.status(401).send();
    } else {
      req.headers.authenticatedUserId = [result[0].id.toString()];
      next();
    }
  } catch (err) {
    res.statusMessage = "Internal Server Error";
    res.status(500).send();
  }
};
