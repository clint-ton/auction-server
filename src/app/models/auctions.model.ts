import { getPool } from "../../config/db";
import fs from "mz/fs";
import * as defaultUsers from "../resources/default_users.json";

const imageDirectory = "./storage/images/";
const defaultPhotoDirectory = "./storage/default/";

import Logger from "../../config/logger";
import { OkPacket, ResultSetHeader, RowDataPacket } from "mysql2";
import { loggers } from "winston";

const search = async (searchData: any): Promise<any> => {
  Logger.info(`Getting all auctions within constraints`);
  const query =
    "SELECT * FROM auction WHERE title LIKE CONCAT('%', ?, '%') AND category_id in (?)";
  const [result] = await getPool().query(query, [
    searchData.search,
    searchData.categories,
    searchData.sellerId,
  ]);
  return result;
};

// const getOne = async (id: number) : Promise<any> => {
//   const query =
// }

const insert = async (
  title: string,
  desc: string,
  endDate: string,
  categoryId: number,
  sellerId: number,
  reserve: number | null = null
): Promise<any> => {
  Logger.info(`Adding auction: ${title}`);
  const query =
    "INSERT INTO auction (title, description, end_date, reserve, seller_id, category_id) VALUES (?)";

  const [id] = await getPool().query(query, [
    [title, desc, endDate, reserve, sellerId, categoryId],
  ]);

  Logger.info(id);
};

const getAllCategories = async () => {
  const [rows] = await getPool().query(
    "SELECT DISTINCT category_id from auction"
  );
  return rows;
};

export { search, insert, getAllCategories };
