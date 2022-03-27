import { Request, Response } from "express";
import Logger from "../../config/logger";
import * as Users from "../models/users.model";
import bcrypt = require("bcrypt");
import jwt = require("jsonwebtoken");

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
    }
    try {
      const id = await Users.register([...userData, hash]);
      res.statusMessage = "OK";
      res.status(200).send({ userId: id });
    } catch (err) {
      if (err.code === "ER_DUP_ENTRY") {
        res.statusMessage = "Email already in use";
        res.status(400).send();
      } else {
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
      }
    }
  });
};

const login = async (req: Request, res: Response): Promise<void> => {
  Logger.http("POST Login request");
  if (!req.body.hasOwnProperty("email")) {
    res.status(400).send("Plese provide an email");
    return;
  }

  try {
    const results = await Users.getHashedPass(req.body.email);
    bcrypt.compare(req.body.password, results.password, (err, result) => {
      if (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
      }

      if (result) {
        try {
          const token = jwt.sign(
            { email: req.body.email },
            process.env.JWT_KEY,
            {
              expiresIn: "1h",
            }
          );
          Users.addToken(results.id, token);
          res.status(200).send({ userId: results.id, token });
        } catch (err) {
          Logger.error(err);
          res.statusMessage = "Internal Server Error";
          res.status(500).send();
        }
      } else {
        res.status(400).send("Failed to authourize");
      }
    });
  } catch (err) {
    res.statusMessage = "Internal Server Error";
    res.status(500).send();
  }
};

const logout = async (req: Request, res: Response): Promise<void> => {
  Logger.http("DEL given user token");
  try {
    const success = await Users.removeToken(req.header("X-Authorization"));
    // if (success) {
    res.status(200).send();
    // } else {
    //   res.status(401).send();
    // }
  } catch (err) {
    res.statusMessage = "Internal Server Error";
    res.status(500).send();
  }
};
export { register, login, logout };
