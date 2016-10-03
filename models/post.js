var mongodb=require('./db');//引入数据库连接
var markdown=require("markdown").markdown;

function Post(name,title,post){
	this.name=name;
	this.title=title;
	this.post=post;
}

module.exports=Post;

//存储一篇文章
Post.prototype.save=function(callback){
	var date=new Date();
	//格式化时间
	var time={
		date:date,
		year:date.getFullYear(),
		month:date.getFullYear()+"-"+(date.getMonth()+1),
		day:date.getFullYear()+"-"+(date.getMonth()+1)+"-"+date.getDate(),
		minute:date.getFullYear()+"-"+(date.getMonth()+1)+"-"+date.getDate()+" "+date.getHours()+":"+(date.getMinutes()<10?'0'+date.getMinutes():date.getMinutes())
	};
	//存入数据库的文档
	var post={
		name:this.name,
		time:time,
		title:this.title,
		post:this.post
	};
	//打开数据库
	mongodb.open(function(err,db){
		if(err){
			return callback(err)
		}
		//读取post集合
		db.collection('posts',function(err,collection){
			if(err){
				mongodb.close();
				return callback(err);
			}
			collection.insert(post,{
				safe:true
			},function(err){
				mongodb.close();//关闭数据库
				if(err){
					return callback(err);//如果出错返回错误
				}
				callback(null);//返回error为Null
			});
		});
	});
}
//读取文章相关相信
Post.get=function(name,callback){
	mongodb.open(function(err,db){
		if(err){
			return callback(err);
		}
		db.collection('posts',function(err,collection){
			if(err){
				mongodb.close();
				return callback(err);
			}
			var query={};
			if(name){
				query.name=name;
			}
			//根据query对象查询文章
			collection.find(query).sort({
				time:-1
			}).toArray(function(err,docs){
				mongodb.close();
				if(err){
					return callback(err);
				}
				docs.forEach(function(doc){
					doc.post=markdown.toHTML(doc.post);//转为markdown格式
				});
				callback(null,docs);//以数组的形式返回查询的结果
			});

		});
	})
}