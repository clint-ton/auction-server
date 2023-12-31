import { Request, Response } from "express";
import Logger from "../../config/logger";
import * as Users from "../models/users.model";
import bcrypt = require("bcrypt");
import {uid} from 'rand-token';
import jwt = require("jsonwebtoken");
import { loggers } from "winston";
import fs = require("fs");

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

  if (req.body.password === "") {
    res.status(400).send("Password must not be blank");
    return;
  }

  try {
    const hash = await bcrypt.hash(req.body.password, 10);
    const userData = [
      req.body.email,
      req.body.firstName,
      req.body.lastName,
      hash,
    ];
    const id = await Users.register(userData);
    res.statusMessage = "OK";
    res.status(201).send({ userId: id });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      res.statusMessage = "Email already in use";
      res.status(403).send();
      return;
    }
    res.status(500).send("Internal Server Error");
  }
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
          const token = uid(64)
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
    await Users.removeToken(req.header("X-Authorization"));
    res.status(200).send();
  } catch (err) {
    res.statusMessage = "Internal Server Error";
    res.status(500).send();
  }
};

const getOneUser = async (req: Request, res: Response): Promise<void> => {
  Logger.http("GET one user");
  try {
    const result = await Users.getOne(parseInt(req.params.id, 10));
    const user = result[0];
    if (user.auth_token === req.header("X-Authorization")) {
      const emailResult = await Users.getEmail(parseInt(req.params.id, 10));
      const email = emailResult[0].email;
      res.status(200).send({
        firstName: user.first_name,
        lastName: user.last_name,
        email,
      });
    } else {
      res
        .status(200)
        .send({ firstName: user.first_name, lastName: user.last_name });
    }
  } catch (err) {
    res.statusMessage = "Internal Server Error";
    res.status(500).send();
  }
};

const edit = async (req: Request, res: Response): Promise<void> => {
  Logger.http("PATCH user");

  const token = req.header("X-Authorization");
  const results = await Users.findUserIdByToken(token);
  const userId = results[0].id;

  if (userId !== parseInt(req.params.id, 10)) {
    res.status(403).send("Unauthorized");
    return;
  }
  if (req.body.hasOwnProperty("email")) {
    const email = req.body.email;
    if (!email.includes("@")) {
      res.status(400).send("Not a valid email address");
      return;
    }
    try {
      await Users.updateColumn("email", email, token);
    } catch (err) {
      res.statusMessage = "Internal Server Error";
      res.status(500).send();
    }
  }
  if (req.body.hasOwnProperty("password")) {
    const newPassword = req.body.password;
    const currentPassword = req.body.currentPassword;

    if (newPassword === "") {
      res.status(400).send("Password must not be blank");
      return;
    }
    try {
      const hash = await Users.tokenToHash(token);
      const result = await bcrypt.compare(currentPassword, hash.password);
      if (result) {
        const newHash = await bcrypt.hash(newPassword, 10);
        await Users.updateColumn("password", newHash, token);
      } else {
        res.statusMessage = "Unauthorized";
        res.status(401).send();
        return;
      }
    } catch (err) {
      Logger.error(err);
      res.statusMessage = "Internal Server Error";
      res.status(500).send();
    }
  }

  if (req.body.hasOwnProperty("firstName")) {
    const firstName = req.body.firstName;
    try {
      await Users.updateColumn("first_name", firstName, token);
    } catch (err) {
      res.statusMessage = "Internal Server Error";
      res.status(500).send();
    }
  }

  if (req.body.hasOwnProperty("lastName")) {
    const lastName = req.body.lastName;
    try {
      await Users.updateColumn("last_name", lastName, token);
    } catch (err) {
      res.statusMessage = "Internal Server Error";
      res.status(500).send();
    }
  }

  res.status(200).send();
};

const getImage = async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.statusMessage = "Not Found";
    res.status(404).send();
    return;
  }

  const userExists = await Users.checkExists(id);
  if (!userExists) {
    res.statusMessage = "Not Found";
    res.status(404).send();
    return;
  }
  try {
    const filename = await Users.getImageName(id);
    fs.readFile("storage/images/" + filename, (err, data) => {
      if (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
      }

      const arr = filename.split(".");
      const extension = arr.pop();

      let mimeType;
      switch (extension) {
        case "jpg":
          mimeType = "image/jpeg";
          break;
        case "jpeg":
          mimeType = "image/jpeg";
          break;
        case "png":
          mimeType = "image/png";
          break;
        case "gif":
          mimeType = "image/gif";
          break;
      }
      res.setHeader("Content-Type", mimeType);
      res.status(200).send(data);
    });
  } catch (err) {
    Logger.error(err);
    res.statusMessage = "Internal Server Error";
    res.status(500).send();
  }
};

const uploadImage = async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.statusMessage = "Not Found";
    res.status(404).send();
    return;
  }

  const token = req.header("X-Authorization");
  const results = await Users.findUserIdByToken(token);
  const userId = results[0].id;

  if (userId !== id) {
    res.statusMessage = "Can only put image for yourself";
    res.status(401).send();
    return;
  }

  const currentImage = await Users.getImageName(id);
  let successCode: number;
  if (currentImage !== null) {
    successCode = 200;
    fs.unlink("storage/images/" + currentImage, (err) => {
      if (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
      }
    });
  } else {
    successCode = 201;
  }

  let extension;
  if (req.is("image/png")) {
    extension = "png";
  } else if (req.is("image/jpeg")) {
    extension = "jpg";
  } else if (req.is("image/gif")) {
    extension = "gif";
  } else {
    res.status(400).send();
    return;
  }

  const filename = `user_${id}.${extension}`;

  fs.writeFile("storage/images/" + filename, req.body, (err) => {
    if (err) {
      res.statusMessage = "Internal Server Error";
      res.status(500).send();
    } else {
      Users.updateColumn("image_filename", filename, token);
      res.status(successCode).send();
    }
  });
};

const deleteImage = async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.statusMessage = "Not Found";
    res.status(404).send();
    return;
  }

  const token = req.header("X-Authorization");
  const results = await Users.findUserIdByToken(token);
  const userId = results[0].id;

  if (userId !== id) {
    res.statusMessage = "Can only put image for yourself";
    res.status(401).send();
    return;
  }

  const currentImage = await Users.getImageName(id);
  if (currentImage === null) {
    res.status(200).send();
    return;
  }

  fs.unlink("storage/images/" + currentImage, (err) => {
    if (err) {
      Logger.error(err);
      res.statusMessage = "Internal Server Error";
      res.status(500).send();
    } else {
      try {
        Users.updateColumn("image_filename", null, token);
        res.status(200).send();
        return;
      } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
      }
    }
  });
};
export {
  register,
  login,
  logout,
  getOneUser,
  edit,
  getImage,
  uploadImage,
  deleteImage,
};
