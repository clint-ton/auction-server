import { Request, Response } from "express";
import Logger from "../../config/logger";
import * as Users from "../models/users.model";
import bcrypt = require("bcrypt");

const register = async (req: Request, res: Response): Promise<void> => {
  Logger.http("POST create user with given info");
  if (
    !req.body.hasOwnProperty("firstName") ||
    !req.body.hasOwnProperty("lastName") ||
    !req.body.hasOwnProperty("email") ||
    !req.body.hasOwnProperty("password")
  ) {
    res.status(400).send("Please provide all required fields fields");
    return;
  }

  if (!req.body.email.includes("@")) {
    res.status(400).send("Not a valid email address");
    return;
  }
  const userData = [req.body.email, req.body.firstName, req.body.lastName];

  bcrypt.hash(req.body.password, 10, async (err: object, hash: string) => {
    if (err) {
      Logger.error(err);
      return res.status(500).send("Error processing password");
    } else {
      try {
        const id = await Users.register([...userData, hash]);
        res.statusMessage = "OK";
        res.status(200).send({ userId: id[0][0]["LAST_INSERT_ID()"] });
      } catch (err) {
        if (err.code === "ER_DUP_ENTRY") {
          res.statusMessage = "Email already in use";
          res.status(400).send();
        }
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
      }
    }
  });
};

export { register };
