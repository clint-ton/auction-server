import { getPool } from "../../config/db";
import fs from "mz/fs";
import * as defaultUsers from "../resources/default_users.json";

const imageDirectory = "./storage/images/";
const defaultPhotoDirectory = "./storage/default/";

import Logger from "../../config/logger";
import { OkPacket, ResultSetHeader, RowDataPacket } from "mysql2";
import { loggers } from "winston";

const register = async (userData: any[]): Promise<any> => {
  const query =
    "INSERT INTO `user` (`email`, `first_name`, `last_name`, `password`) VALUES (?)";

  try {
    await getPool().query(query, [userData]);
    try {
      const id = await getPool().query("SELECT LAST_INSERT_ID()");
      return id[0][0]["LAST_INSERT_ID()"];
    } catch (err) {
      Logger.error(err.sql);
    }
  } catch (err) {
    Logger.error(err.sql);
    throw err;
  }
};

const getHashedPass = async (email: string): Promise<any> => {
  Logger.info("Looking up hashed user password");
  const query = "SELECT password, id FROM user WHERE email = ?";
  try {
    const [[result]] = await getPool().query(query, email);
    return result;
  } catch (err) {
    Logger.error(err);
    throw err;
  }
};

const addToken = async (id: number, token: string): Promise<any> => {
  Logger.info("Associating token with user");
  const query = "UPDATE user set auth_token = ? WHERE id = ?";
  try {
    const result = await getPool().query(query, [token, id]);
    return result;
  } catch (err) {
    Logger.error(err);
    throw err;
  }
};

const removeToken = async (token: string): Promise<any> => {
  Logger.info("Attempting to remove token from DB");
  const query = "UPDATE user set auth_token = null WHERE auth_token = ?";
  try {
    const [result] = await getPool().query(query, [token]);
    if (result.affectedRows > 0) {
      return true;
    } else {
      return false;
    }
  } catch (err) {
    Logger.error(err);
    throw err;
  }
};

const findUserIdByToken = async (token: string): Promise<any> => {
  Logger.info("Looking up user ID");
  const query = "SELECT id FROM user WHERE auth_token = ?";
  try {
    const [result] = await getPool().query(query, token);
    return result;
  } catch (err) {
    Logger.error(err);
    throw err;
  }
};
export { register, getHashedPass, addToken, removeToken, findUserIdByToken };
