var Service = require('../lib/service.js');
var redis = require('redis');
var assert = require('assert');

var redisClient = redis.createClient();
			
redisClient.flushdb();
	
var s1A = new Service(redisClient,{ name:"Foo", version:"0.1", url:"http://localhostA:3000/" });
s1A.start();
var s1B = new Service(redisClient,{ name:"Foo", version:"0.1", url:"http://localhostB:3000/" });
s1B.start();
var s1C = new Service(redisClient,{ name:"Foo", version:"0.1", url:"http://localhostC:3000/" });
s1C.start();
var s2A = new Service(redisClient,{ name:"Foo", version:"0.2", url:"http://localhostA:3000/" });
s2A.start();
var s2B = new Service(redisClient,{ name:"Foo", version:"0.2", url:"http://localhostB:3000/" });
s2B.start();
var s2C = new Service(redisClient,{ name:"Foo", version:"0.2", url:"http://localhostC:3000/" });
s2C.start();

var b1A = new Service(redisClient,{name:"Bar",version:"0.1",url:"http://localhost:3001/"});
b1A.start();

var z1A = new Service(redisClient,{ name:"Baz", version:"0.1", url:"http://localhostA:3000/" });
z1A.start();
var z1B = new Service(redisClient,{ name:"Baz", version:"0.1", url:"http://localhostB:3000/" });
z1B.start();
var z1C = new Service(redisClient,{ name:"Baz", version:"0.1", url:"http://localhostC:3000/" });
z1C.start();
var z2A = new Service(redisClient,{ name:"Baz", version:"0.2", url:"http://localhostA:3000/" });
z2A.start();
var z2B = new Service(redisClient,{ name:"Baz", version:"0.2", url:"http://localhostB:3000/" });
z2B.start();
var z2C = new Service(redisClient,{ name:"Baz", version:"0.2", url:"http://localhostC:3000/" });
z2C.start();


describe("Service",function(){

	it("should create a route and be able to resolve it",function(done){

			Service.setPrimary(redisClient,"Baz@0.1",function(err,res){
				Service.addRoute(redisClient,"/foo","Foo",function(err,res){
					Service.addRoute(redisClient,"/foo1","Foo@0.1",function(err,res){
						Service.addRoute(redisClient,"/bar","Bar",function(err,res){
							Service.addRoute(redisClient,"/baz","Baz",function(err,res){
								

									Service.loadRouteCache(redisClient,function(err,router){

										//Test to make sure it resolves to the latest service	
										assert.equal("Foo@0.2",router.match("/foo").service);
										//Test to make sure we can resolve to a fixed version
										assert.equal("Foo@0.1",router.match("/foo1").service);
										//Test to make sure we can resolve a single service to the latest version
										assert.equal("Bar@0.1",router.match("/bar").service);
										//Test to make sure that resolving by a primary service works
										assert.equal("Baz@0.1",router.match("/baz").service);
	

										done();
									});


							});
						});
					});
				});
			});

	});

	it("should be able to create a service route cache",function(done){	
		var updates=0;
		var sc = new Service.RouterCache(redisClient,function(err){
				assert.equal(null,err);
				sc.listenForUpdates(redis,function(route){
					console.log("Got route update");
					updates++;
				});

				Service.addRoute(redisClient,"/foo3","Foo@0.1",function(err,res){
					setTimeout(function(){
						assert.equal(updates,1);
						assert.equal("Foo@0.1",sc.resolve("/foo3").service);
						done();
					},400);
				});

		});
	});
	
});
