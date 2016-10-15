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
Post.getAll=function(name,callback){
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

//获取一篇文章
Post.getOne=function(name,day,title,callback){
	mongodb.open(function(err,db){
		if(err){
			return callback(err);
		}
		db.collection('posts',function(err,collection){
			if(err){
				mongodb.close();
				return callback(err);
			}
			collection.findOne({
				"name":name,
				"time.day":day,
				"title":title
			},function(err,doc){
				mongodb.close();
				if(err){
					return callback(err);
				}
				doc.post=markdown.toHTML(doc.post);
				callback(null,doc);//返回查询的一篇文章
			});
		});
	})
}
//编辑文章
Post.edit=function(name,day,title,callback){
	mongodb.open(function(err,db){
		if(err){
			return callback(err);
		}
		//获得post的集合
		db.collection("posts",function(err,collection){
			if(err){
				mongodb.close();
				return callback(err);
			}
			//根据条件查询
			collection.findOne({
				"name":name,
				"time.day":day,
				"title":title,
			},function(err,doc){
				mongodb.close();
				if(err){
					return callback(err);
				}
				callback(null,doc);//返回查询的一篇文章
			});
		});

	});
}

//更新一篇文章及其相关信息
Post.update = function(name, day, title, post, callback) {
  //打开数据库
  mongodb.open(function (err, db) {
    if (err) {
      return callback(err);
    }
    //读取 posts 集合
    db.collection('posts', function (err, collection) {
      if (err) {
        mongodb.close();
        return callback(err);
      }
      //更新文章内容
      collection.update({
        "name": name,
        "time.day": day,
        "title": title
      }, {
        $set: {post: post}//$set用来指定一个键的值.如果这个键存在,就修改它;不存在,就创建它
      }, function (err) {
        mongodb.close();
        if (err) {
          return callback(err);
        }
        callback(null);
      });
    });
  });
};
//删除一篇文章
Post.remove = function(name, day, title, callback) {
  //打开数据库
  mongodb.open(function (err, db) {
    if (err) {
      return callback(err);
    }
    //读取 posts 集合
    db.collection('posts', function (err, collection) {
      if (err) {
        mongodb.close();
        return callback(err);
      }
      //根据用户名、日期和标题查找并删除一篇文章
      collection.remove({
        "name": name,
        "time.day": day,
        "title": title
      }, {
        w: 1//w=1表示只有一个节点写入成功即返回,w=2表示两个节点写入成功才返回,更多w的含义请查看官方文档.一般w=1就可以了
      }, function (err,doc) {
        mongodb.close();
        if (err) {
          return callback(err);
        }
        callback(null,doc);
      });
    });
  });
};