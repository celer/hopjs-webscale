/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path');

var RedisStore = require('connect-redis')(express);

var app = express();

var HopService = require('../../index.js');

console.log(HopService);

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.cookieParser());
  app.use(express.session({
		secret: "mysecret",
		store: new RedisStore()	
	}));
  app.use(HopService.ServiceProxy());
	app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

var redis = require('redis');
var redisClient = redis.createClient();


HopService.Service.cache(redisClient,function(err,cache){
	console.log(err,cache)
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.get('/',function(req,res){
	req.session.foo=1;
	res.send("Hello");
});
app.get('/users', user.list);

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
