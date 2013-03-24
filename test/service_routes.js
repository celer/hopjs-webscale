var Service = require('../lib/service.js');
var redis = require('redis');
var assert = require('assert');

var redisClient = redis.createClient();
			
redisClient.flushdb();


describe("Service",function(){

	it("should create a route and be able to resolve it",function(done){
		Service.addRoute(redisClient,"/foo/bar","Foo",function(err,res){
			assert.equal(null,err);	
			Service.listRoutes(redisClient,function(err,res){
				assert.equal(null,err);	
				assert.deepEqual(res,{"/foo/bar":"Foo"});	
				Service.resolveRoute(redisClient,"/foo/bar",function(err,res){
					assert.equal(null,err);
					assert.equal(res,"Foo");
					done();
				});
			});
		});
	});
	
	it("should create a route and be able to delete it",function(done){
		Service.addRoute(redisClient,"/cat/bar","Foo1",function(err,res){
			Service.delRoute(redisClient,"/cat/bar",function(err,res){
				assert.equal(null,err);	
					Service.resolveRoute(redisClient,"/cat/bar",function(err,res){
						assert.equal(null,err);
						assert.equal(null,res);
						done();
					});
			});
		});
	});

	
	it("should create a route and be able to resolve it",function(done){
		Service.addRoute(redisClient,"/foo/*","Foo1",function(err,res){
			Service.addRoute(redisClient,"/foo/bar","Foo2",function(err,res){
				assert.equal(null,err);	
					Service.resolveRoute(redisClient,"/foo/bar",function(err,res){
						assert.equal(null,err);
						assert.equal(res,"Foo2");
						Service.resolveRoute(redisClient,"/foo/baz/bar",function(err,res){
							assert.equal(null,err);
							assert.equal(res,"Foo1");
							done();
						});
					});
			});
		});
	});

});
