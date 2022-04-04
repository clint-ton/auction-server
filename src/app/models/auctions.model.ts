import { getPool } from "../../config/db";
import fs from "mz/fs";
import * as defaultUsers from "../resources/default_users.json";

const imageDirectory = "./storage/images/";
const defaultPhotoDirectory = "./storage/default/";

import Logger from "../../config/logger";
import { OkPacket, ResultSetHeader, RowDataPacket } from "mysql2";
import { loggers } from "winston";
import { timeStamp } from "console";

const search = async (
  title: string,
  categories: number | null,
  sellerId: number
): Promise<any> => {
  Logger.info(`Getting all auctions within constraints`);
  let query = "SELECT * FROM auction WHERE title LIKE CONCAT('%', ?, '%') ";
  const categoryQuery = "AND category_id in (?) ";
  const sellerQuery = "AND seller_id = ? ";

  const params: any[] = [title];

  if (categories != null) {
    query += categoryQuery;
    params.push(categories);
  }

  if (sellerId != null) {
    query += sellerQuery;
    params.push(sellerId);
  }

  const [result] = await getPool().query(query, params);
  return result;
};

const getOne = async (id: number): Promise<any> => {
  const mainQuery =
    "SELECT title, category_id, seller_id, reserve, end_date, description FROM auction WHERE id = ?";
  const nameQuery = "SELECT first_name, last_name FROM user where id = ?";
  const maxQuery = "SELECT MAX(amount) FROM auction_bid WHERE auction_id = ?";
  const numQuery = "SELECT count(*) FROM auction_bid WHERE auction_id = ?";

  const [results] = await getPool().query(mainQuery, id);
  if (results.length <= 0) {
    return null;
  }
  const record = results[0];
  const [nameResult] = await getPool().query(nameQuery, record.seller_id);
  const nameRecord = nameResult[0];

  const [maxResult] = await getPool().query(maxQuery, id);
  const maxRecord = maxResult[0];

  const [numResult] = await getPool().query(numQuery, id);
  const numRecord = numResult[0];
  return {
    auctionId: id,
    title: record.title,
    categoryId: record.category_id,
    sellerId: record.seller_id,
    sellerFirstName: nameRecord.first_name,
    sellerLastName: nameRecord.last_name,
    reserve: record.reserve,
    numBids: numRecord["count(*)"],
    highestBid: maxRecord["MAX(amount)"],
    endDate: record.end_date,
    description: record.description,
  };
};

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

  await getPool().query(query, [
    [title, desc, endDate, reserve, sellerId, categoryId],
  ]);

  const id = await getPool().query("SELECT LAST_INSERT_ID()");
  return id[0][0]["LAST_INSERT_ID()"];
};

const getAllCategoryIds = async () => {
  const [rows] = await getPool().query(
    "SELECT DISTINCT category_id from auction"
  );
  return rows;
};

const updateColumn = async (
  field: string,
  value: any,
  id: number
): Promise<any> => {
  const query = `UPDATE auction set ${field} = ? WHERE id = ?`;

  const [result] = await getPool().query(query, [value, id]);
  return result;
};

const getSellerId = async (auctionId: number) => {
  const [result] = await getPool().query(
    "SELECT seller_id FROM auction WHERE id = ?",
    auctionId
  );
  return result[0].seller_id;
};

const listCategories = async () => {
  const [result] = await getPool().query("SELECT * FROM category");
  return result;
};

const getBids = async (auctionId: number) => {
  const [result] = await getPool().query(
    "SELECT * FROM auction_bid WHERE auction_id = ?",
    auctionId
  );
  return result;
};

const checkExists = async (id: number) => {
  const [result] = await getPool().query(
    "SELECT 1 FROM auction WHERE id = ?",
    id
  );
  return result.length > 0;
};

const remove = async (id: number) => {
  const [result] = await getPool().query(
    "DELETE FROM auction WHERE id = ?",
    id
  );
  return result;
};

const getHighestBid = async (id: number) => {
  const [result] = await getPool().query(
    "SELECT MAX(amount) FROM auction_bid WHERE auction_id = ?",
    id
  );

  return result[0];
};

const createBid = async (
  auctionId: number,
  userId: number,
  amount: number,
  timestamp: string
) => {
  await getPool().query(
    "INSERT INTO auction_bid (auction_id, user_id, amount, timestamp) VALUES (?)",
    [[auctionId, userId, amount, timestamp]]
  );
};

const getImageName = async (id: number) => {
  const [result] = await getPool().query(
    "SELECT image_filename FROM auction WHERE id = ?",
    id
  );

  return result[0].image_filename;
};

const userHasBid = async (auctionId: number, bidderId: number) => {
  const [result] = await getPool().query(
    "SELECT * FROM auction_bid WHERE auction_id = ? AND user_id = ?",
    [auctionId, bidderId]
  );

  return result;
};

export {
  search,
  insert,
  getAllCategoryIds,
  getOne,
  getSellerId,
  updateColumn,
  listCategories,
  getBids,
  checkExists,
  remove,
  getHighestBid,
  createBid,
  getImageName,
  userHasBid,
};
