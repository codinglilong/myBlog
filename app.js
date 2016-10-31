var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');//bodyParser中间件用来解析http请求体
var routes = require('./routes/index');
var settings=require('./settings.js');
// var users = require('./routes/users');
var flash=require("connect-flash");

var session =require('express-session');//express session中间件
var MongoStore=require('connect-mongo')(session);//mongo session中间件
var mongoose = require('mongoose');

var fs = require('fs');
var accessLog = fs.createWriteStream('access.log', {flags: 'a'});
var errorLog = fs.createWriteStream('error.log', {flags: 'a'});
var app = express();// 生成一个express实例app

app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));//设置views文件夹为存放视图的文件夹。
app.set('view engine', 'ejs');//设置视图模版引擎为ejs

app.use(flash());
app.use(favicon(path.join(__dirname, 'public/images', 'favicon.ico')));
app.use(logger('dev'));//加载日志中间件
app.use(logger({stream: accessLog}));

app.use(bodyParser.json());//加载json的中间件
app.use(bodyParser.urlencoded({ extended: false }));//加载解析urlencoded请求体的中间件
app.use(cookieParser()); //加载解析cookie的中间件
app.use(session({
  resave:false,//添加这行  
  saveUninitialized: true,//添加这行   
  secret: settings.cookieSecret,
  key: settings.db,//cookie name
  cookie: {maxAge: 1000 * 60 * 60 * 24 * 30},//30 days
  store: new MongoStore({
    url: 'mongodb://localhost/blog',
    db: settings.db,
    host: settings.host,
    port: settings.port
  })
}));

app.use(express.static(path.join(__dirname, 'public')));//设置public文件夹为存放静态文件的文件夹
app.use(function (err, req, res, next) {
  var meta = '[' + new Date() + '] ' + req.url + '\n';
  errorLog.write(meta + err.stack + '\n');
  next();
});

routes(app);

app.listen(app.get('port'),function(){
   console.log('服务器已启动，端口号：'+app.get('port'));
 });


// app.use('/users', users);//路由控制器

// // 捕获404错误，并转发到错误处理器
// app.use(function(req, res, next) {
//   var err = new Error('Not Found');
//   err.status = 404;
//   next(err);
// });

// // error handlers

// //开发环境下的错误信息，将错误信息渲染error模版并显示到浏览器中
// if (app.get('env') === 'development') {
//   app.use(function(err, req, res, next) {
//     res.status(err.status || 500);
//     res.render('error', {
//       message: err.message,
//       error: err
//     });
//   });
// }

// //生产环境下的错误信息，将错误信息渲染error模版并显示到浏览器中
// app.use(function(err, req, res, next) {
//   res.status(err.status || 500);
//   res.render('error', {
//     message: err.message,
//     error: {}
//   });
// });


// module.exports = app;//导出app实例供其他模块使用
