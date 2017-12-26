#!/usr/bin/env nodejs
const assert = require('assert');
const mongo = require('mongodb').MongoClient;
const process = require('process');

const users = require('./model/users');
const model = require('./model/model');
const server = require('./server/server');
const options = require('./options.js').options;

const DB_URL = 'mongodb://localhost:27017/users';


// function getPort(argv) {
//   let port = null;
//   if (argv.length !== 3 || !(port = Number(argv[2]))) {
//     console.error(`usage: ${argv[1]} PORT`);
//     process.exit(1);
//   }
//   return port;
// }

// const port = getPort(process.argv);
const port = options.port;

  

mongo.connect(DB_URL).
  then(function(db) {
    const model1 = new model.Model(db);
    server.serve(port,options, model1);
    //db.close();
  }).
  catch((e) => console.error(e));