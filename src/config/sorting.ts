import Logger from "./logger";
import { getHighestBid } from "../app/models/auctions.model";

const closingSoon = (a: any, b: any) => {
  if (Date.parse(a.end_date) < Date.parse(b.end_date)) {
    return -1;
  } else {
    return 1;
  }
};

const closingLast = (a: any, b: any) => {
  if (Date.parse(a.end_date) < Date.parse(b.end_date)) {
    return 1;
  } else {
    return -1;
  }
};

const alphabetical = (a: any, b: any) => {
  if (a.title < b.title) {
    return -1;
  } else {
    return 1;
  }
};

const alphabeticalReverse = (a: any, b: any) => {
  if (a.title < b.title) {
    return 1;
  } else {
    return -1;
  }
};

const bidsAscending = (a: any, b: any) => {
  if (a.highestBid < b.highestBid) {
    return -1;
  } else {
    return 1;
  }
};

const bidsDecending = (a: any, b: any) => {
  if (a.highestBid < b.highestBid) {
    return 1;
  } else {
    return -1;
  }
};

const reserveDecending = (a: any, b: any) => {
  if (a.reserve < b.reserve) {
    return 1;
  } else {
    return -1;
  }
};

const reserveAcending = (a: any, b: any) => {
  if (a.reserve < b.reserve) {
    return -1;
  } else {
    return 1;
  }
};
export {
  closingSoon,
  closingLast,
  alphabetical,
  alphabeticalReverse,
  bidsAscending,
  bidsDecending,
  reserveAcending,
  reserveDecending,
};
