import { Request, Response } from "express";
import Logger from "../../config/logger";
import * as Auctions from "../models/auctions.model";
import { findUserIdByToken } from "../models/users.model";
import fs = require("fs");
import e = require("express");
import * as sorting from "../../config/sorting";
import { loggers } from "winston";
import * as Users from "../models/users.model";

const list = async (req: Request, res: Response): Promise<void> => {
  try {
    let search = "";
    let seller: number | null = null;
    let category = null;
    let sortBy;

    if (req.query.hasOwnProperty("q")) {
      search = req.query.q as string;
    }
    if (req.query.hasOwnProperty("categoryIds")) {
      category = req.query.categoryIds as string;
      if (typeof category === "string") {
        category = parseInt(category, 10);
      }
    }

    if (req.query.hasOwnProperty("sellerId")) {
      seller = parseInt(req.query.sellerId as string, 10);
    }

    const resultNoBidder = await Auctions.search(search, category, seller);

    for (const row of resultNoBidder) {
      const maxBid = await Auctions.getHighestBid(row.id);

      row.highestBid = maxBid["MAX(amount)"];
    }

    let result = [];

    if (req.query.hasOwnProperty("bidderId")) {
      const bidderId = parseInt(req.query.bidderId as string, 10);
      for (const row of resultNoBidder) {
        const bidders = await Auctions.userHasBid(row.id, bidderId);
        if (bidders.length > 0) {
          result.push(row);
        }
      }
    } else result = resultNoBidder;

    const output = [];
    let count;
    let startIndex;
    if (req.query.hasOwnProperty("count")) {
      count = parseInt(req.query.count as string, 10);
    } else {
      count = result.length;
    }

    if (req.query.hasOwnProperty("startIndex")) {
      startIndex = parseInt(req.query.startIndex as string, 10);
    } else {
      startIndex = 0;
    }

    for (let i = startIndex; i < startIndex + count; i++) {
      if (result[i] !== undefined) {
        output.push(result[i]);
      }
    }

    if (req.query.hasOwnProperty("sortBy")) {
      switch (req.query.sortBy as string) {
        case "ALPHABETICAL_ASC":
          sortBy = sorting.alphabetical;
          break;
        case "ALPHABETICAL_DESC":
          sortBy = sorting.alphabeticalReverse;
          break;
        case "BIDS_ASC":
          sortBy = sorting.bidsAscending;
          break;
        case "BIDS_DESC":
          sortBy = sorting.bidsDecending;
          break;
        case "CLOSING_LAST":
          sortBy = sorting.closingLast;
          break;
        case "RESERVE_ASC":
          sortBy = sorting.reserveAcending;
          break;
        case "RESERVE_DESC":
          sortBy = sorting.reserveDecending;
          break;
        default:
          sortBy = sorting.closingSoon;
      }
    }

    output.sort(sortBy);

    for (const auction of output) {
      auction.auctionId = auction.id;
      delete auction.id;
      auction.sellerId = auction.seller_id;
      delete auction.seller_id;
      auction.categoryId = auction.category_id;
      delete auction.category_id;
      auction.endDate = auction.end_date;
      delete auction.end_date;
      auction.imageFilename = auction.image_filename;
      delete auction.image_filename;
      const numBids = await Auctions.getBids(auction.auctionId);
      auction.numBids = numBids.length;
    }
    res.statusMessage = "OK";
    res.status(200).send({ count: output.length, auctions: output });
  } catch (err) {
    Logger.error(err);
    res.statusMessage = "Internal Server Error";
    res.status(500).send();
  }
};

const create = async (req: Request, res: Response): Promise<void> => {
  Logger.info("POST new auction");
  if (
    !req.body.hasOwnProperty("title") ||
    !req.body.hasOwnProperty("description") ||
    !req.body.hasOwnProperty("categoryId") ||
    !req.body.hasOwnProperty("endDate")
  ) {
    res.status(400).send("Please provide all required fields fields");
    return;
  }

  const title = req.body.title;
  const desc = req.body.description;
  const category = req.body.categoryId;
  const endDate = req.body.endDate;
  let reserve = null;

  if (req.body.hasOwnProperty("reserve")) {
    reserve = req.body.reserve;
  }

  if (Date.parse(endDate) < Date.now()) {
    res.status(400).send("Auctions must end in the future");
    return;
  }

  // Check category IDs
  try {
    const categories = await Auctions.getAllCategoryIds();
    let categoryExists = false;
    for (const row of categories) {
      if (row.category_id === parseInt(category, 10)) {
        categoryExists = true;
      }
    }

    if (!categoryExists) {
      res.status(400).send("Category ID must exist");
      return;
    }
  } catch (err) {
    Logger.log(err);
  }
  try {
    const results = await findUserIdByToken(req.header("X-Authorization"));
    const sellerId = results[0].id;
    const id = await Auctions.insert(
      title,
      desc,
      endDate,
      category,
      sellerId,
      reserve
    );
    res.status(201).send({ auctionId: id });
  } catch (err) {
    Logger.error(err);
    if (err.code === "ER_DUP_ENTRY") {
      res.statusMessage = "Duplicate entry";
      res.status(403).send();
      return;
    }
    res.statusMessage = "Internal Server Error";
    res.status(500).send();
  }
};

const read = async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.statusMessage = "No Results Found";
    res.status(404).send();
    return;
  }

  try {
    const results = await Auctions.getOne(id);
    if (results === null) {
      res.statusMessage = "No Results Found";
      res.status(404).send();
      return;
    }

    res.status(200).send(results);
  } catch (err) {
    res.statusMessage = "Internal Server Error";
    res.status(500).send();
    return;
  }
};

const update = async (req: Request, res: Response): Promise<void> => {
  Logger.http("PATCH Auction");

  const auctionId = parseInt(req.params.id, 10);
  if (isNaN(auctionId)) {
    res.statusMessage = "No Results Found";
    res.status(404).send();
    return;
  }
  let auctionExists;
  try {
    auctionExists = await Auctions.checkExists(auctionId);
  } catch (err) {
    Logger.error(err);
    res.statusMessage = "Internal Server Error";
    res.status(500).send();
  }

  if (!auctionExists) {
    res.statusMessage = "No Results Found";
    res.status(404).send();
    return;
  }

  const token = req.header("X-Authorization");
  const results = await findUserIdByToken(token);
  const userId = results[0].id;

  const sellerId = await Auctions.getSellerId(auctionId);

  if (userId !== sellerId) {
    res.statusMessage = "Must be the auction seller";
    res.status(401).send();
    return;
  }

  const bidList = await Auctions.getBids(auctionId);

  if (bidList.length > 0) {
    res.statusMessage = "Cannot change auction after a bid has been placed";
    res.status(403).send();
    return;
  }

  if (req.body.hasOwnProperty("categoryId")) {
    const categoryId = req.body.categoryId;
    const categoryIds = await Auctions.getAllCategoryIds();
    let categoryExists = false;
    for (const row of categoryIds) {
      if (row.category_id === parseInt(categoryId, 10)) {
        categoryExists = true;
      }
    }
    if (!categoryExists) {
      res.statusMessage = "Given Category does not exist";
      res.status(400).send();
      return;
    }
    try {
      Auctions.updateColumn("category_id", categoryId, auctionId);
    } catch (err) {
      Logger.error(err);
      res.statusMessage = "Internal Server Error";
      res.status(500).send();
    }
  }

  if (req.body.hasOwnProperty("endDate")) {
    const endDate = Date.parse(req.body.endDate);

    if (isNaN(endDate)) {
      res.statusMessage = "Invalid date format";
      res.status(400).send();
      return;
    }

    if (endDate < Date.now()) {
      res.statusMessage = "Auction end date must be in the future";
      res.status(400).send();
      return;
    }
    try {
      Auctions.updateColumn("end_date", endDate, auctionId);
    } catch (err) {
      Logger.error(err);
      res.statusMessage = "Internal Server Error";
      res.status(500).send();
      return;
    }
  }
  try {
    if (req.body.hasOwnProperty("title")) {
      Auctions.updateColumn("title", req.body.title, auctionId);
    }

    if (req.body.hasOwnProperty("description")) {
      Auctions.updateColumn("description", req.body.description, auctionId);
    }

    if (req.body.hasOwnProperty("reserve")) {
      const reserve = parseInt(req.body.reserve, 10);
      if (isNaN(reserve)) {
        res.statusMessage = "Reserve Must be a number";
        res.status(400).send();
        return;
      }
      Auctions.updateColumn("reserve", reserve, auctionId);
    }
  } catch (err) {
    Logger.error(err);
    res.statusMessage = "Internal Server Error";
    res.status(500).send();
  }

  res.status(200).send();
};

const readCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const results = await Auctions.listCategories();
    for (const category of results) {
      category.categoryId = category.id;
      delete category.category_id;
    }
    res.status(200).send(results);
  } catch (err) {
    res.statusMessage = "Internal Server Error";
    res.status(500).send();
  }
};

const remove = async (req: Request, res: Response): Promise<void> => {
  const auctionId = parseInt(req.params.id, 10);
  if (isNaN(auctionId)) {
    res.statusMessage = "No Results Found";
    res.status(404).send();
    return;
  }

  const auctionExists = await Auctions.checkExists(auctionId);

  if (!auctionExists) {
    res.statusMessage = "No Results Found";
    res.status(404).send();
    return;
  }

  const token = req.header("X-Authorization");
  const results = await findUserIdByToken(token);
  const userId = results[0].id;

  const sellerId = await Auctions.getSellerId(auctionId);

  if (userId !== sellerId) {
    res.statusMessage = "Must be the auction seller";
    res.status(401).send();
    return;
  }

  const bidList = await Auctions.getBids(auctionId);

  if (bidList.length > 0) {
    res.statusMessage = "Cannot delete auction after a bid has been placed";
    res.status(403).send();
    return;
  }

  try {
    const recordsChanged = await Auctions.remove(auctionId);
    if (recordsChanged <= 0) {
      res.statusMessage = "No Results Found";
      res.status(404).send();
      return;
    } else {
      res.status(200).send();
    }
  } catch (err) {
    res.statusMessage = "Internal Server Error";
    res.status(500).send();
  }
};

const listBids = async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.statusMessage = "Not Found";
    res.status(404).send();
    return;
  }

  try {
    const results = await Auctions.getBids(id);

    results.sort((a: any, b: any) => {
      return a.amount - b.amount;
    });

    for (const bid of results) {
      bid.bidderId = bid.user_id;
      delete bid.auction_id;
      delete bid.id;
      try {
        const userName = await Users.getUserName(bid.bidderId);
        bid.firstName = userName[0];
        bid.lastName = userName[1];
        delete bid.user_id;
      } catch (err) {
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
      }
    }

    res.status(200).send(results);
  } catch (err) {
    Logger.error(err);
    res.statusMessage = "Internal Server Error";
    res.status(500).send();
  }
};

const newBid = async (req: Request, res: Response): Promise<void> => {
  try {
    const auctionId = parseInt(req.params.id, 10);
    const auctionExists = await Auctions.checkExists(auctionId);
    if (!auctionExists) {
      res.statusMessage = "Not Found";
      res.status(404).send();
      return;
    }

    if (!req.body.hasOwnProperty("amount")) {
      res.statusMessage = "No amount provided";
      res.status(400).send();
      return;
    }

    const amount = req.body.amount;
    const currentBid = await Auctions.getHighestBid(auctionId);
    if (amount <= currentBid) {
      res.statusMessage = "New bid must be higher than current highest bid";
      res.status(403).send();
      return;
    }

    const results = await findUserIdByToken(req.header("X-Authorization"));
    const sellerId = results[0].id;

    await Auctions.createBid(
      auctionId,
      sellerId,
      amount,
      new Date().toISOString().slice(0, 19).replace("T", " ")
    );
    res.status(201).send();
  } catch (err) {
    Logger.error(err);
    res.statusMessage = "Internal Server Error";
    res.status(500).send();
  }
};

const getImage = async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.statusMessage = "Not Found";
    res.status(404).send();
    return;
  }

  const auctionExists = await Auctions.checkExists(id);
  if (!auctionExists) {
    res.statusMessage = "Not Found";
    res.status(404).send();
    return;
  }
  try {
    const filename = await Auctions.getImageName(id);
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
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.statusMessage = "Not Found";
      res.status(404).send();
      return;
    }

    const token = req.header("X-Authorization");
    const results = await findUserIdByToken(token);
    const userId = results[0].id;

    const sellerId = await Auctions.getSellerId(id);

    if (userId !== sellerId) {
      res.statusMessage = "Must be the auction seller";
      res.status(401).send();
      return;
    }

    const currentImage = await Auctions.getImageName(id);
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

    const filename = `auction_${id}.${extension}`;

    fs.writeFile("storage/images/" + filename, req.body, (err) => {
      if (err) {
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
      } else {
        Auctions.updateColumn("image_filename", filename, id);
        res.status(successCode).send();
      }
    });
  } catch (err) {
    res.statusMessage = "Internal Server Error";
    res.status(500).send();
  }
};

export {
  list,
  create,
  read,
  update,
  readCategories,
  remove,
  listBids,
  newBid,
  getImage,
  uploadImage,
};
