import db from "../db/index.js";

export const query = db.query;
export const getClient = db.getClient;
export const getDbMode = db.getDbMode;
export const isOnline = db.isOnline;
export const initDatabase = db.initDatabase;
export const saveSnapshot = db.saveSnapshot;
export const restoreSnapshot = db.restoreSnapshot;
export const scheduleSnapshot = db.scheduleSnapshot;

export default db;
