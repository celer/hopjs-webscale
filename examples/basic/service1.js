
var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path');


var app = express();


var RedisStore = require('connect-redis')(express);

var HopService = require('../../index.js');

app.configure(function(){
  app.set('port', process.env.PORT || 3001);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.cookieParser());
  app.use(express.session({
		secret: "mysecret",
		store: new RedisStore()	
	}));
	app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

var redis = require('redis');
var redisClient = redis.createClient();

var service = new HopService.Service(redisClient,{ name:"Service1",version:"0.1", url:"http://localhost:"+app.get("port")+"/"});

service.start();

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.get("/foo",function(req,res){
	console.log(req.session);
	res.send("Foo");
});

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
