var Service = require('../lib/service.js');
var redis = require('redis');
var assert = require('assert');

var redisClient = redis.createClient();
			
redisClient.flushdb();

var s1A = new Service(redisClient,{ name:"Foo", version:"0.1", url:"http://localhostA:3000/" });

describe("Service",function(){

	it("Should send audit messages",function(done){
		var stop = Service.onAuditMessage(redis,function(msg){
			assert.equal(msg.type,"log");
			assert.equal(msg.msg,"msg");
			done();
		});	
		setTimeout(function(){	
			s1A.log("msg");
		},1000);
	});

});
