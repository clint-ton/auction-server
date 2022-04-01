import { Express } from "express";
import { rootUrl } from "./base.routes";
import loginRequired from "../middleware/loginRequired.middleware";

import * as auctions from "../controllers/auctions.controller";

const auctionsUrl = rootUrl + "/auctions";

module.exports = (app: Express) => {
  app.route(auctionsUrl).get(auctions.list);
  app.route(auctionsUrl).post(loginRequired, auctions.create);
};
