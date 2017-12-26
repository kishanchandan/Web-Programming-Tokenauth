const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const https = require('https');
const fs = require('fs');
var randomstring = require("randomstring");

const BAD_REQUEST = 400;
const OK = 200;
const CREATED = 201;
const NOT_FOUND = 404;
const SEE_OTHER = 303;
const UNAUTHORIZED = 401;
const SERVER_ERROR = 500;
const NO_CONTENT = 204;


function serve(port,options, model) {
  const app = express();
  app.locals.model = model;
  app.locals.port = port;
  app.locals.options=options;
  const KEY_PATH = `${app.locals.options.sslDir}/key.pem`;
  const CERT_PATH = `${app.locals.options.sslDir}/cert.pem`;
  const authTimeout = app.locals.options.authTimeout;
  setupRoutes(app);
  https.createServer({
  key: fs.readFileSync(KEY_PATH),
  cert: fs.readFileSync(CERT_PATH),
}, app).listen(port, function() {
    console.log(`listening on port ${port}`);
  });

}


function setupRoutes(app) {
  app.use('/users/:id', bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.put('/users/:id', addUser(app));
  app.use('/users/:id', cacheUser(app));
  app.get('/users/:id', getUser(app));
  app.use('/users/:id/auth', bodyParser.json());
  app.use('/users/:id/auth', cacheUser(app));
  app.use('/users/:id/auth', checkUserPass(app));
  app.put('/users/:id/auth', updatetoken(app));  
  app.delete('/users/:id', deleteUser(app));
  app.post('/users/:id', updateUser(app));
}
  

function cacheUser(app) {
  return function(request, response, next) {
    const id = request.params.id;
    if (typeof id === 'undefined') {
      response.sendStatus(BAD_REQUEST);
    }
    else {
      request.app.locals.model.users.getUserBeforeAuth(id).
        then(function(validuserfound) {
          next();
        }).catch((err) => {
          response.status(NOT_FOUND);
          response.json({
                    status: "ERROR_NOT_FOUND",
                    info: `user ${id} not found`
              
                });
        });
      }
    }
}
 
function checkUserPass(app) {
  return function(request, response, next) {
    const id = request.params.id;
    const pass = request.body;
    if (typeof id ==='undefined' || typeof pass === 'undefined') {
      response.sendStatus(BAD_REQUEST);
    }
    else {
      request.app.locals.model.users.getUserPassBeforeAuth(id,pass).
        then(function(ifpassmatches) {
          next();
        }).
        catch((err) => {
          response.status(UNAUTHORIZED); 
          response.json({ status: "ERROR_UNAUTHORIZED",info: `/users/${id}/auth requires a valid 'pw' password query parameter`});
        });
    }
  }
}    

function getUser(app) {
  return function(request, response) {
    const id = request.params.id;
    const authheader = request.headers.authorization;
    if (typeof id === 'undefined') {
      response.sendStatus(BAD_REQUEST);
    }
    else if(typeof authheader==='undefined'){
        response.status(UNAUTHORIZED);
        response.json({ status: "ERROR_UNAUTHORIZED",info: `/users/${id} requires a bearer authorization header`});
    }
    else {
      const bearer = authheader.substring(7);
      request.app.locals.model.users.getUser(id,bearer).
	     then((output) => response.json(output)).
      	catch((err) => {
          response.status(UNAUTHORIZED);
      	  response.json({ status: "ERROR_UNAUTHORIZED",info: `/users/${id} requires a bearer authorization header`});
      	});
          }
  };
}

function deleteUser(app) {
  return function(request, response) {
    const id = request.params.id;
    if (typeof id === 'undefined') {
      response.sendStatus(BAD_REQUEST);
    }
    else {
      request.app.locals.model.users.deleteUser(id).
	then(() => response.end()).
	catch((err) => {
	  console.error(err);
	  response.sendStatus(NOT_FOUND);
	});
    }
  };
}


function addUser(app) {
  return function(request, response) {
    const id = request.params.id;
    const pass = request.query.pw;
    const data = request.body;
    const authTimeout = app.locals.options.authTimeout;
    if (typeof data ==='undefined'|| typeof id==='undefined'|| typeof pass==='undefined') {
      response.sendStatus(BAD_REQUEST);
    }
    else {
      request.app.locals.model.users.addUser(id,pass,data,authTimeout).
	     then(function(output) {
        if(output.status==="CREATED"){
           response.status(CREATED);
           response.location(`/users/${id}`);
           response.json(output);
            
        }
        else{
          response.location(`/users/${id}`);
          response.json(output);

        }
        
       }).
	     catch((err) => {
	     console.error(err);
	     });
      }
    }; 
}

function getProducts(app) {
  return function(request, response) {
    const q = request.query.q;
    if (typeof q === 'undefined') {
      response.sendStatus(BAD_REQUEST);
    }
    else {
      request.app.locals.model.products.find(q).
  then((results) => response.json(results)).
  catch((err) => {
    console.error(err);
    response.sendStatus(SERVER_ERROR);
  });
    }
  };
}

function updateUser(app) {
  return function(request, response) {
    const id = request.params.id;
    const userinfo = request.body;
    if (typeof userinfo==='undefined') {
      response.sendStatus(BAD_REQUEST);
    }
    else {
      request.app.locals.model.users.updateUser(id,userinfo).
	then(function(id) {
  }).
	catch((err) => {
	  console.error(err);
	  response.sendStatus(NOT_FOUND);
	});
    
  };
}
}

function updatetoken(app) {
  return function(request, response) {
    const id = request.params.id;
    const pass = request.body;
    const authTimeout = app.locals.options.authTimeout;
    if (typeof id==='undefined' || typeof pass==='undefined') {
      response.sendStatus(BAD_REQUEST);
    }
    else {
      request.app.locals.model.users.updatetoken(id,pass,authTimeout).
        then(function(generatedtoken) {
          response.status(OK);
          response.json({ status: "OK",authToken: `${generatedtoken}`});
        }).
        catch((err) => {
          console.error(err);
          response.sendStatus(NOT_FOUND);
        });
          
      };
  }
}

function Users(db) {
  this.db = db;
  this.users = db.collection('users');
}


function requestUrl(req) {
  const port = req.app.locals.port;
  return `${req.protocol}://${req.hostname}:${port}${req.originalUrl}`;
}

module.exports = {
  serve: serve
}

