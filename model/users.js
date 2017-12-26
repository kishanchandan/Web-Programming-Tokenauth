const assert = require('assert');
const ObjectID = require('mongodb').ObjectID;
const USERS = 'users';
var bcrypt = require('bcrypt');
const saltRounds = 10;
var randomstring = require("randomstring");
const express = require('express');

const bodyParser = require('body-parser');
const app = express();
app.use('/users/:id', bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));



Users.prototype.getUser = function(id,bearer) {
  const searchSpec = { _id: id, tokenarray: { $elemMatch: { authtoken: bearer,validity:{$gte:new Date()} } }};
  return this.users.find(searchSpec).toArray().
    then(function(userlist) {
      return new Promise(function(resolve, reject) {
      	if (userlist.length === 1) {
      	  resolve(userlist[0].data);
      	}
      	else {
      	  reject();
      	}
      });
    });
}

Users.prototype.getUserBeforeAuth = function(id) {
  const searchSpec = { _id: id };
  return this.users.find(searchSpec).toArray().
    then(function(userlist) {
    return new Promise(function(resolve, reject) {
        if (userlist.length === 1) {
          resolve(userlist[0].data);
        }
        else {
          reject();
        }
      })
  });     
}

Users.prototype.getUserPassBeforeAuth = function(id, pass) {
  const searchSpec = { _id: id };
  return this.users.find(searchSpec).toArray().
    then(function(userlist) {
      return new Promise(function(resolve, reject) {
          if (userlist.length === 1) {
            var passmatches = bcrypt.compareSync(pass.pw, userlist[0].password);
            if(passmatches){
            resolve(userlist[0].data);  
            }
            else{
            reject();  
            }
          }
          else {
            reject();
          }
      });
    });
}

Users.prototype.addUser = function(id,pass,data,authTimeout) {
      var hashedpass = bcrypt.hashSync(pass, saltRounds);
      var authtoken = randomstring.generate();
      var currenttime = new Date();
      var validity = new Date(currenttime.getTime() + (1000 * authTimeout));
      const token_timeout_pair = [{authtoken,validity}]; 
      insertdata = { _id: id,password:hashedpass, data,tokenarray:token_timeout_pair};
      return this.users.insertOne(insertdata).
      then(function(output){
          return {
            status: "CREATED",
            authToken: authtoken
          };
      
      }).catch((err) => {
        console.log(err);
          return {
            status: "EXISTS",
            info: `user ${id} already exists`
          };
    
    });     
}




Users.prototype.updatetoken = function(id,pass,authTimeout) {
            currenttime = new Date();
            validity = new Date(currenttime.getTime() + (1000 * authTimeout));
            var authtoken = randomstring.generate();
            const token_timeout_pair = {authtoken,validity}; 
            return this.users.updateOne({_id: id},{ $push: { "tokenarray": token_timeout_pair }}).
            then(function(output) {
            return new Promise(function(resolve, reject) {
            if (output.modifiedCount !== 1) {
              reject(`{ "status": "ERROR_UNAUTHORIZED","info": "/users/${id}/auth requires a valid 'pw' password query parameter"}`);
            }
            else {
            resolve(authtoken);
            }
          });
        });
}

function Users(db) {
  this.db = db;
  this.users = db.collection(USERS);
}

module.exports = {
  Users: Users
};
