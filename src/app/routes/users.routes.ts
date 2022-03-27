import { Express } from "express";
import { rootUrl } from "./base.routes";

import * as users from "../controllers/users.controller";

const usersUrl = rootUrl + "/users";

module.exports = (app: Express) => {
  app.route(usersUrl + "/register").post(users.register);
};
