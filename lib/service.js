var Router = require('./router');

/**
	service = { name: name, version: version, url: (tries to self resolve) }
*/
Service=function(redisClient,service){
	if(!service) throw "Invalid service specified";
	if(!redisClient) throw "No redisClient specified for service";
	if(!service.name) throw "No service name specified";
	if(typeof service.version=="undefined") throw "No service version specified";
	if(!service.url) throw "No service URL specified";

	this.redisClient=redisClient;
	this.interval=null;	
	this.service=service;
}

Service.duration=10;

Service.prototype.key=function(){
		var self=this;
		return ("service-"+self.service.name+"@"+self.service.version+"-"+self.service.url);
}


Service.prototype.advertise=function(){
		var self=this;
		self.service.when=Date.now();
		self.redisClient.setex(self.key(),Service.duration-1,JSON.stringify(self.service));
}

Service.prototype.audit=function(type,msg,request){
	var msg = { source: this.service.name+"@"+this.service.version+"-"+this.service.url, msg: msg, type: type, when: Date.now() };
	if(request){
		if(request.ip) msg.ip=request.ip;
		if(request.session && request.session.user){
			if(request.session.user.name || request.session.user.username || request.session.user.email)
				msg.user=request.session.user.name || request.session.user.username || request.session.user.email;
			if(typeof request.session.user.id!="undefined")
				msg.userID=request.session.user.id;	
		}
	}
	this.redisClient.publish("audit",JSON.stringify(msg));
}

Service.prototype.debug=function(msg,request){ this.audit("debug",msg,request); };
Service.prototype.log=function(msg,request){ this.audit("log",msg,request); };
Service.prototype.error=function(msg,request){ this.audit("error",msg,request); };
Service.prototype.warn=function(msg,request){ this.audit("warn",msg,request); };
Service.prototype.security=function(msg,request){ this.audit("security",msg,request); };

Service.onAuditMessage=function(redis,onAuditMsg){
	var redisClient = redis.createClient();
	var done = function(){ redisClient.unsubscribe(); redisClient.end(); }
	redisClient.on("message",function(channel,message){
		if(channel=="audit"){
			try {
				onAuditMsg(JSON.parse(message));	
			} catch(e){}
		}	
	});
	redisClient.subscribe("audit");
	return done;
}

Service.prototype.start=function(){
	var self=this;
	if(this.interval==null){
		this.interval=setInterval(function(){
			self.advertise();
		},Service.duration*1000);
		this.log("Started");
		self.advertise();
		Service.cache(this.redisClient);
	}
}

Service.prototype.stop=function(){
	var self=this;
	if(this.interval!=null){
		var msg = 
		this.log("Stopping");
		this.redisClient.del(self.key());
		Service.cache(this.redisClient);
		clearInterval(this.interval);
	}
}


Service.setSelector=function(redisClient,name,selectorFunc,onComplete){
	var np = Service.parseName(name);
	if(typeof np.version!="undefined") return onComplete("Invalid service name specified, must not include version.");

	//FIXME This should do testing on the selector to make sure that it is valid before installing it
	redisClient.get(Service.recordKey(np.name),function(err,record){
		if(err) return onComplete(err);
		if(record){
			record = JSON.parse(record);	
		}	
		record=record||{};
		record.selector = selectorFunc.toString();
		redisClient.set(Service.recordKey(np.name),JSON.stringify(record),function(err,res){
			Service.cache(redisClient,function(){
				onComplete(err,res);
			});
		});		
	});
}

Service.delSelector=function(redisClient,name,version,onComplete){
	var np = Service.parseName(name);
	//FIXME This should do testing on the selector to make sure that it is valid before installing it
	redisClient.get(Service.recordKey(np.name),function(err,record){
		if(err) return onComplete(err);
		if(record){
			record = JSON.parse(record);	
		}	
		record=record||{};
		delete record.selector;
		redisClient.set(Service.recordKey(np.name),JSON.stringify(record),function(err,res){
			Service.cache(redisClient,function(){
				onComplete(err,res);
			});
		});		
	});
}

Service.setPrimary=function(redisClient,name,onComplete){	
	var np = Service.parseName(name);
	if(typeof np.version=="undefined") return onComplete("Invalid service name specified, must include version:"+name);
	//FIXME This should do testing on the selector to make sure that it is valid before installing it
	redisClient.get(Service.recordKey(np.name),function(err,record){
		if(err) return onComplete(err);
		if(record){
			record = JSON.parse(record);	
		}	
		record=record||{};
		record.primary=name;
		redisClient.set(Service.recordKey(np.name),JSON.stringify(record),function(err,res){
			Service.cache(redisClient,function(){
				onComplete(err,res);
			});
		});
	});
}

Service.delPrimary=function(redisClient,name,onComplete){
	var np = Service.parseName(name);
	//FIXME This should do testing on the selector to make sure that it is valid before installing it
	redisClient.get(Service.recordKey(np.name),function(err,record){
		if(err) return onComplete(err);
		if(record){
			record = JSON.parse(record);	
		}	
		record=record||{};
		delete record.primary;
		redisClient.set(Service.recordKey(np.name),JSON.stringify(record),function(err,res){	
			Service.cache(redisClient,function(){
				onComplete(err,res);
			});
		});
	});
}

Service.parseName=function(name){
	if(name.indexOf("service-")==0){
		var n = name.split("-");
		name = n[1];
		var url = n[2];
	}	
	var np = name.split("@");
	if(np.length==1)
		return { name: np[0] };
	if(np.length==2)
		return { name: np[0], version: np[1], url: url};
}

Service.sortByLatest=function(arrayOfServices){
	return arrayOfServices.sort(function(a,b){
		var na = Service.parseName(a);
		var nb = Service.parseName(b);
		if(na.version>nb.version) return -1;
		else if(na.version<nb.version) return 1;
		else return 0;
	})
}

Service.loadBalance=function(arrayOfServices){
	return arrayOfServices[Math.floor(arrayOfServices.length*Math.random())];
}

Service.loadServiceRecord=function(redisClient,name,onComplete){
	redisClient.get(Service.recordKey(name),function(err,record){
		if(err) return onComplete(err);
		if(!record) return onComplete(null,null);
		try {
			record = JSON.parse(record);
		} catch (e){
			return onComplete(err);
		}
		return onComplete(null,record);
	});
}

Service.saveServiceRecord=function(redisClient,name,record,onComplete){
	redisClient.set(Service.recordKey(name),JSON.stringify(record),onComplete);
}	


Service.find=function(redisClient,name,onComplete,request){
	var np = Service.parseName(name);
	var primary=null;
	
	var findAPI = function(name,onComplete){
		redisClient.keys("service-"+name+"*",function(err,services){
			if(err) return onComplete(err);
			var foundServices = [];
			var uniqueServices = {};
			for(var serviceName in services){	
				var sn = Service.parseName(services[serviceName]);
				foundServices.push(services[serviceName]);
				if(!uniqueServices[ sn.name+"@"+sn.version]){
					uniqueServices[ sn.name+"@"+sn.version]=[];
				}
				uniqueServices[ sn.name+"@"+sn.version].push(services[serviceName]);
			}
			var versions = Object.keys(uniqueServices);
			versions=Service.sortByLatest(versions);	
			if(versions.length>0){
				var services = uniqueServices[versions[0]];
				var service = Service.loadBalance(services);
				service.resolution="latest";
				return onComplete(null,service);	
			} else return onComplete(null,null);
		});	
	}

	var resolveByRecord=function(){
		redisClient.get(Service.recordKey(np.name),function(err,res){
			if(res){
				var resolved=null;
				try {
					var resolvedName=null;
					var record = JSON.parse(res);	
					if(record.selector){
						eval("var selector = "+record.selector);
						resolvedName=selector(request);
						if(resolvedName)
							resolved="selector";
					} 			
				} catch(e){
					console.error(e.stack);
				}
				if(!resolvedName && record.primary){
					resolvedName=record.primary;
					resolved="primary";
				}
				if(resolvedName)
					name=resolvedName;
			}
			findAPI(name,function(err,service){
				redisClient.get(service,function(err,res){
					if(!err && res){
						res = JSON.parse(res);
					  res.resolution=resolved||"latest";
					}
					return onComplete(err,res);
				})
			});
		});
	}

	//No specfic version of the API was requested, let's find the primary one
	if(typeof np.version=="undefined"){
		resolveByRecord();
	} else {
		findAPI(name,function(err,service){
			redisClient.get(service,function(err,res){
				if(!err && res){
					res = JSON.parse(res);
					res.resolution="specific_version";
				}
				return onComplete(err,res);
			})
		});
	}
}

Service.recordKey=function(name){
	return "svrptr-"+name;
}

Service.cacheKey=function(){
	return "route-cache";
}

Service.list=function(redisClient,onComplete){
		redisClient.keys("service-*",function(err,services){
			if(err) return onComplete(err);
			var uniqueServices = {};
			for(var serviceName in services){	
				var sn = Service.parseName(services[serviceName]);
				if(!uniqueServices[ sn.name+"@"+sn.version]){
					uniqueServices[ sn.name+"@"+sn.version]=[];
				}
				uniqueServices[ sn.name+"@"+sn.version].push(services[serviceName]);
			}
			return onComplete(null,uniqueServices);
		});	
}

Service.delRoute=function(redisClient,path,onComplete,force){
	redisClient.get("routes",function(err,routes){
		if(err) return onComplete(err);
		try {	
			if(routes){
				routes=JSON.parse(routes);
				var router = Router.fromJSON(routes);
			} else {
				var router = new Router();
			}
			router.del(path);
			redisClient.set("routes",JSON.stringify(router),function(err,res){
				Service.cache(redisClient,function(){
					return onComplete(err,res);
				});
			});
		} catch(e){
			return onComplete(e);
		}
	});
}

Service.addRoute=function(redisClient,path,name,onComplete,force){
	redisClient.get("routes",function(err,routes){
		if(err) return onComplete(err);
		try {	
			if(routes){
				routes=JSON.parse(routes);
				var router = Router.fromJSON(routes);
			} else {
				var router = new Router();
			}
			router.add(path,name);
			redisClient.set("routes",JSON.stringify(router),function(err,res){
				Service.cache(redisClient,function(){
					return onComplete(err,res);
				});
			});
		} catch(e){
			return onComplete(e);
		}
	});
}


Service.listRoutes=function(redisClient,onComplete){
	redisClient.get("routes",function(err,routes){
		if(err) return onComplete(err);
		try {	
			routes=JSON.parse(routes);
			var router = Router.fromJSON(routes);
			var res = {};
			router.map(function(route,data){
				res[route]=data;
			});
			return onComplete(null,res);
		} catch(e){
			return onComplete(e);
		}
	});
	
}

Service.resolveRoute=function(redisClient,inpath,onComplete){
	//FIXME This should cache the routing table!
	redisClient.get("routes",function(err,routes){
		if(err) return onComplete(err);
		try {	
			routes=JSON.parse(routes);
			var router = Router.fromJSON(routes);
			return onComplete(null, router.match(inpath));
		} catch(e){
			return onComplete(e);
		}
	});
}

/**
	This function needs to create a complete cache of the data in redis :(
	Might as well have never bothered putting it all into redis
	Essentially it needs a cache of routes
	And a cache of services that are actively running
	
		This way it can resolve a route without having to risk a task switch 
		so that the HTTP proxy will work
*/	

Service.cache=function(redisClient,onComplete){
	onComplete=onComplete||function(){};
	Service.buildCache(redisClient,function(err,res){
		redisClient.set(Service.cacheKey(),JSON.stringify(res),function(err,res){
			redisClient.publish(Service.cacheKey(),JSON.stringify({ updated: Date.now() }),function(){
				onComplete(err,res);
			});
		});
	});
}

Service.loadRouteCache=function(redisClient,onComplete){
	redisClient.get(Service.cacheKey(),function(err,res){
		if(err) return onComplete(err);
		return onComplete(null,Router.fromJSON(res));
	});
}

Service.RouterCache=function(redisClient,onComplete){
	var self=this;
	this.redisClient=redisClient;
	Service.loadRouteCache(redisClient,function(err,router){
		if(err) return onComplete(err);
		self.router=router;	
		return onComplete(null,self);
	});	
}

Service.RouterCache.prototype.listenForUpdates=function(redis,onUpdate){
	var self=this;
	onUpdate=onUpdate||function(){};
	var redisClient = redis.createClient();
	var done = function(){ redisClient.unsubscribe(); redisClient.end(); }
	redisClient.on("message",function(channel,message){
		if(channel==Service.cacheKey()){
			try {
				Service.loadRouteCache(self.redisClient,function(err,res){
					if(err) return;
					if(res){
						self.router=res;
						try { 
							onUpdate();
						} catch(e){}
					}
				});
			} catch(e){}
		}	
	});
	redisClient.subscribe(Service.cacheKey());
	return done;

}

Service.RouterCache.prototype.resolve=function(path){
	return this.router.match(path);
}


Service.buildCache=function(redisClient,onComplete){
	var findLatest=function(cache,name){
			var serviceNames = [];
			for(var i in cache.services){
				var spn = Service.parseName(i);
				if(spn.name==name){
					serviceNames.push(i);
				}	
			}	
			if(serviceNames.length>0){
				Service.sortByLatest(serviceNames);
				var latest = serviceNames[0];
				return latest;
			} else {
				return null;
			}	
	}
	var resolveService = function(cache,data){
		var pn = Service.parseName(data);
		if(pn.name && typeof pn.version!="undefined"){
			return { resolution: "specific-version", services: cache.services[pn.name+"@"+pn.version], service: pn.name+"@"+pn.version }
		} else if(cache.records[pn.name]){
			if(cache.records[pn.name].selector){
				//FIXME This should make it so it falls through, if the selector fails, then it hits the primary, etc
				var selector = cache.records[pn.name].selector;
				var primary = cache.records[pn.name].primary;
				var latest = findLatest(cache,pn.name);
				return { selector: selector, resolution: "selector", services: cache.services[primary||latest], service: (primary||latest) };
			}
			if(cache.records[pn.name].primary){
				return { resolution: "primary", services: cache.services[cache.records[pn.name].primary], service: cache.records[pn.name].primary }	
			}
		} else {
			var latest = findLatest(cache,pn.name);
			if(latest){
				return { services: cache.services[latest], resolution: "latest", service: latest }
			} else return null;
		}
	}


	var buildCache=function(cache){
		var r = new Router();
		cache.router.map(function(path,data){
			var res = resolveService(cache,data);
			r.add(path,res);
		});	
		return onComplete(null,r);
	}

	var router = new Router();
	Service.listRoutes(redisClient,function(err,res){
		var recordsToProcess={};
		for(var i in res){
			router.add(i,res[i]);
			var pn = Service.parseName(res[i]);
			recordsToProcess[pn.name]=true;
		}
		var records = Object.keys(recordsToProcess);
		Service.list(redisClient,function(err,services){
			var cache = { router: router, services: services, records:{} };
		
			var processRecord=function(){
				if(records.length>0){
					var rn = records.shift();
					redisClient.get(Service.recordKey(rn),function(err,res){
						var res = JSON.parse(res);
						cache.records[rn]=res;
						processRecord();
					});
				} else {
					buildCache(cache);
				}
			}
			processRecord();
		});
	});
}

module.exports=Service;

