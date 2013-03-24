var Service = require('./service');
var httpProxy = require('http-proxy');
var url = require('url');

var ServiceProxy = function(redisClient){
	if(!redisClient){
		var redis = require('redis');
		redisClient = redis.createClient();	
	}
	var proxy = new httpProxy.RoutingProxy();

	var serviceRouterCache = new Service.RouterCache(redisClient,function(){
		serviceRouterCache.listenForUpdates(redis,function(){
			console.log("Router update recieved");
		});	
	});

	return function(request,response,next){
		console.log("Trying to resolve",request.url);

			var result = serviceRouterCache.resolve(request.url);
			if(!result) return next();

			var target = Service.loadBalance(result.services);
			if(!target) return next();
			var pn = Service.parseName(target);		

			if(!pn.url) return next();
			var targetUrl = url.parse(pn.url)

			console.log("Routing to",targetUrl);

			proxy.proxyRequest(request,response,{
				host: targetUrl.hostname,
				port: targetUrl.port 
			});
	}
}

module.exports=ServiceProxy
