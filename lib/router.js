
var Router=function(){
	this.routes={};
}

Router.fromJSON=function(json){
	if(typeof json=="string")
		json=JSON.parse(json);
	var r = new Router();
	for(var i in json){
		r[i]=json[i];
	}	
	return r;
}	

Router.prototype.del=function(path){
	for(var i in this.routes){
		if(i===path){
			delete this.routes[i];
		}
	}
}

Router.prototype.add=function(path,data){
	this.when = Date.now();

	var rp = path.split("/");


	var re = path.replace(/\//g,"\\/");
	var re = re.replace(/\:[^\/]+/g,"[^\\/]+");
	var re = re.replace(/\*/g,".+");

	var re = "^"+re+"$";

	var route = { priority:0, re: re, path: path, data: data };

	rp.map(function(p){
		if(p=='*'){ 
			
		} else if(/:./.test(p)){

		} else {
			route.priority++;
		}
	});

	this.routes[path]=route;	

}

Router.prototype.map=function(onItem){
	var self=this;
	for(var i in this.routes){
		onItem(i,self.routes[i].data);
	}
}

Router.prototype.match=function(path){
	var matches = [];
	for(var rp in this.routes){
		var route = this.routes[rp];
		if(route.re && !route._re){
			route._re = new RegExp(route.re);
		}
		if(route._re.test(path)){
			matches.push(route);
		}
	}
	if(matches.length==0) return null;
	var res = matches.sort(function(a,b){
		if(a.priority<b.priority) return 1;
		if(a.priority>b.priority) return -1;
		return 0;
	});
	return res[0].data;
}
module.exports=Router;
