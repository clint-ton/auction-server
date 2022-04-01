import { Request, Response } from "express";
import Logger from "../../config/logger";
import * as Auctions from "../models/auctions.model";
import { findUserIdByToken } from "../models/users.model";

const list = async (req: Request, res: Response): Promise<void> => {
  try {
    const params: any = {
      search: "",
      categories: [],
      seller_id: "*",
      bidder_id: "*",
    };
    const result = await Auctions.search(params);
    res.statusMessage = "OK";
    res.status(200).send();
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
    const categories = await Auctions.getAllCategories();
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
    const sellerId: number = await findUserIdByToken(
      req.header("X-Authorization")
    );
    const id = await Auctions.insert(
      title,
      desc,
      endDate,
      category,
      sellerId,
      reserve
    );
    res.status(200).send({ auctionId: id });
  } catch (err) {
    Logger.error(err);
    res.statusMessage = "Internal Server Error";
    res.status(500).send();
  }
};
export { list, create };
