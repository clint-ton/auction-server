import { Express } from "express";
import { rootUrl } from "./base.routes";
import loginRequired from "../middleware/loginRequired.middleware";

import * as auctions from "../controllers/auctions.controller";

const auctionsUrl = rootUrl + "/auctions";

module.exports = (app: Express) => {
  app.route(auctionsUrl + "/categories").get(auctions.readCategories);
  app.route(auctionsUrl).post(loginRequired, auctions.create);
  app.route(auctionsUrl).post(loginRequired, auctions.create);
  app.route(auctionsUrl).get(auctions.list);
  app
    .route(auctionsUrl + "/:id")
    .get(auctions.read)
    .patch(loginRequired, auctions.update)
    .delete(loginRequired, auctions.remove);

  app
    .route(auctionsUrl + "/:id/bids")
    .get(auctions.listBids)
    .post(auctions.newBid);

  app
    .route(auctionsUrl + "/:id/image")
    .get(auctions.getImage)
    .put(loginRequired, auctions.uploadImage);
};
