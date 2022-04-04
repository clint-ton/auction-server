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

const findUserIdByToken = async (token: string): Promise<any[]> => {
  const query = "SELECT id FROM user WHERE auth_token = ?";
  try {
    const [result] = await getPool().query(query, token);
    return result;
  } catch (err) {
    Logger.error(err);
    throw err;
  }
};

const getOne = async (id: number): Promise<any> => {
  Logger.info(`Getting user ${id} from the database`);
  const conn = await getPool().getConnection();
  const query =
    "SELECT first_name, last_name, auth_token FROM user WHERE id = ?";
  const [rows] = await conn.query(query, id);
  conn.release();
  return rows;
};

const getEmail = async (id: number): Promise<any> => {
  Logger.info(`Getting email for user ${id} `);
  const conn = await getPool().getConnection();
  const query = "select email from user where id = ?";
  const [rows] = await conn.query(query, id);
  conn.release();
  return rows;
};

const updateUser = async (newData: any, token: string): Promise<any> => {
  Logger.info("Updating user info");
  const query =
    "UPDATE user set first_name = ?, last_name = ?, email = ?, password = ? WHERE auth_token = ?";

  const [result] = await getPool().query(query, [
    newData.firstName,
    newData.lastName,
    newData.email,
    newData.password,
    token,
  ]);
  return result;
};

const updateColumn = async (
  field: string,
  value: any,
  token: string
): Promise<any> => {
  Logger.info("Updating user info");
  const query = `UPDATE user set ${field} = ? WHERE auth_token = ?`;

  const [result] = await getPool().query(query, [value, token]);
  return result;
};

const tokenToHash = async (token: string): Promise<any> => {
  Logger.info("Looking up hashed user password");
  const query = "SELECT password FROM user WHERE auth_token = ?";
  try {
    const [[result]] = await getPool().query(query, token);
    return result;
  } catch (err) {
    Logger.error(err);
    throw err;
  }
};

const getImageName = async (id: number) => {
  const [result] = await getPool().query(
    "SELECT image_filename FROM user WHERE id = ?",
    id
  );

  return result[0].image_filename;
};

const checkExists = async (id: number) => {
  const [result] = await getPool().query("SELECT 1 FROM user WHERE id = ?", id);
  return result.length > 0;
};

const getUserName = async (id: number) => {
  const [result] = await getPool().query(
    "SELECT first_name, last_name FROM user WHERE id = ?",
    id
  );

  return [result[0].first_name, result[0].last_name];
};

export {
  register,
  getHashedPass,
  addToken,
  removeToken,
  findUserIdByToken,
  getOne,
  getEmail,
  updateUser,
  updateColumn,
  tokenToHash,
  getImageName,
  checkExists,
  getUserName,
};
