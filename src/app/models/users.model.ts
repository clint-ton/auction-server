import { getPool } from "../../config/db";
import fs from "mz/fs";
import * as defaultUsers from "../resources/default_users.json";

const imageDirectory = "./storage/images/";
const defaultPhotoDirectory = "./storage/default/";

import Logger from "../../config/logger";
import { OkPacket, ResultSetHeader, RowDataPacket } from "mysql2";

const register = async (userData: any[]): Promise<any> => {
  const query =
    "INSERT INTO `user` (`email`, `first_name`, `last_name`, `password`) VALUES (?)";

  try {
    await getPool().query(query, [userData]);
    try {
      const id = await getPool().query("SELECT LAST_INSERT_ID()");
      return id;
    } catch (err) {
      Logger.error(err.sql);
    }
  } catch (err) {
    Logger.error(err.sql);
    throw err;
  }
};

export { register };
