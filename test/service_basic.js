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

	describe("Service",function(){

		it("should list all the created services",function(done){
			Service.list(redisClient,function(err,res){
					assert.equal(true,res["Foo@0.1"]!=null);
					assert.equal(true,res["Foo@0.2"]!=null);
					assert.equal(true,res["Bar@0.1"]!=null);
					assert.equal(true,res["Foo@0.1"].length==3);
					assert.equal(true,res["Foo@0.2"].length==3);
					assert.equal(true,res["Bar@0.1"].length==1);
					done();
			});
		});

		it("should return the latest service, when no version or primary service is defined",function(done){
			Service.find(redisClient,"Foo",function(err,res){
				assert.equal(err,null);
				assert.equal(res.name,"Foo");
				assert.equal(res.version,"0.2");
				assert.equal(res.resolution,"latest");
				done();
			});	
		});
		
		it("should't find anything when there isn't a matching service name",function(done){
			Service.find(redisClient,"Boo",function(err,res){
				assert.equal(err,null);
				assert.equal(res,null);
				done();
			});
		});
	
		it("should return the latest service, when no version or primary service is defined",function(done){
			Service.find(redisClient,"Bar",function(err,res){
				assert.equal(err,null);
				assert.equal(res.name,"Bar");
				assert.equal(res.version,"0.1");
				assert.equal(res.resolution,"latest");
				done();
			});	
		});
		
		it("should return the the specific version of a service",function(done){
			Service.find(redisClient,"Foo@0.1",function(err,res){
				assert.equal(err,null);
				assert.equal(res.name,"Foo");
				assert.equal(res.version,"0.1");
				done();
			});	
		});
		
		it("should return the the specific version of a service",function(done){
			Service.find(redisClient,"Foo@0.2",function(err,res){
				assert.equal(err,null);
				assert.equal(res.name,"Foo");
				assert.equal(res.version,"0.2");
				done();
			});	
		});

		it("should return the primary version of a service",function(done){
			Service.setPrimary(redisClient,"Foo@0.1",function(err,res){
				Service.find(redisClient,"Foo",function(err,res){
					assert.equal(err,null);
					assert.equal(res.name,"Foo");
					assert.equal(res.version,"0.1");

					Service.setPrimary(redisClient,"Foo@0.2",function(err,res){
						Service.find(redisClient,"Foo",function(err,res){
							assert.equal(err,null);
							assert.equal(res.name,"Foo");
							assert.equal(res.version,"0.2");
							Service.find(redisClient,"Foo@0.1",function(err,res){
								assert.equal(res.name,"Foo");
								assert.equal(res.version,"0.1");
								Service.delPrimary(redisClient,"Foo",function(err,res){
									done();
								});
							});
						});	
					
					});
				});	
				
			});
		});	

		it("should use the selector function",function(done){
			Service.setSelector(redisClient,"Foo",function(request){
				if(request.service) return request.service;
				else return null;
			},function(err,res){
				Service.find(redisClient,"Foo",function(err,res){
					assert.equal(err,null);	
					assert.equal(res.name,"Bar");
					assert.equal(res.version,"0.1");
					Service.find(redisClient,"Foo",function(err,res){
						assert.equal(err,null);	
						assert.equal(res.name,"Foo");
						assert.equal(res.version,"0.2");
						done();
					},{service:null });
				}, { service:"Bar@0.1"});
			});
		});
	});
