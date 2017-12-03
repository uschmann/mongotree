const MongoClient = require('mongodb').MongoClient;

const db = {};
let connection = null;

db.connect = function connect(url) {
  return new Promise((resolve, reject) => {
    MongoClient.connect(url, (err, db) => {
      if(err) {
        reject(err);
      }
      
      connection = db;
      resolve(db);
    });
  }); 
};

db.get = function get() {
  return connection;
}

module.exports = db;