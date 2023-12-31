import { Express } from "express";
import { rootUrl } from "./base.routes";
import loginRequired from "../middleware/loginRequired.middleware";

import * as users from "../controllers/users.controller";

const usersUrl = rootUrl + "/users";

module.exports = (app: Express) => {
  app.route(usersUrl + "/register").post(users.register);
  app.route(usersUrl + "/login").post(users.login);
  app.route(usersUrl + "/logout").post(loginRequired, users.logout);
  app
    .route(usersUrl + "/:id")
    .get(loginRequired, users.getOneUser)
    .patch(loginRequired, users.edit);

  app
    .route(usersUrl + "/:id/image")
    .get(users.getImage)
    .put(loginRequired, users.uploadImage)
    .delete(loginRequired, users.deleteImage);
};
