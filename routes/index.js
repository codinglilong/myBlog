var crypto = require('crypto'); //加密密码模块
var User = require('../models/user.js');
var Post = require('../models/post.js');
var multer = require("multer") //上传文件中间件

var storage = multer.diskStorage({
    destination: function(req, file, cb) { //指定上传的文件所在的目录
        cb(null, './public/images')
    },
    filename: function(req, file, cb) { //filename 函数用来修改上传后的文件名
        cb(null, file.originalname) //保持原来的文件名
    }
})

var upload = multer({ storage: storage })

module.exports = function(app) {
    app.get('/', function(req, res) {
        // res.render("index",getStatus('首页',req));
        Post.getAll(null, function(err, posts) {
            if (err) {
                posts = [];
            }
            res.render('index', {
                title: '首页',
                user: req.session.user,
                posts: posts,
                success: req.flash("success").toString(),
                error: req.flash("error").toString()
            });
        });
    });
    app.get('/reg', checkNotLogin);
    app.get('/reg', function(req, res) {
        res.render("reg", getStatus('注册', req));
    });
    app.post('/reg', checkNotLogin);
    app.post('/reg', function(req, res) {
        var name = req.body.userName,
            password = req.body.userPwd,
            password_re = req.body['userPwd-repeat'];

        if (password != password_re) {
            req.flash('error', '两次密码输入不一致');
            return res.redirect('/reg');
        }
        //生成md5值
        var md5 = crypto.createHash('md5'),
            password = md5.update(req.body.userPwd).digest('hex');
        //创建新用户实例
        var newUser = new User({
            name: req.body.userName,
            password: password,
            email: req.body.email
        });

        //检查用户是否已经存在
        User.get(newUser.name, function(err, user) {
            if (err) {
                req.flash("error", err);
                return res.redirect('/');
            }
            if (user) {
                req.flash('error', '用户已存在');
                return res.redirect('/reg'); //返回注册页面
            }
            newUser.save(function(err, user) {
                if (err) {
                    req.flash("error", err);
                    return res.redirect('/reg'); //注册失败返回注册页
                }
                req.session.user = user;
                req.flash('success', '注册成功');
                res.redirect('/'); //注册成功后返回首页
            });
        });
    });
    app.get('/login', checkNotLogin);
    app.get('/login', function(req, res) {
        res.render('login', getStatus('登录', req));
    });

    app.post('/login', checkNotLogin);
    //登录请求
    app.post('/login', function(req, res) {
        var md5 = crypto.createHash('md5'),
            password = md5.update(req.body.userPwd).digest('hex');
        User.get(req.body.userName, function(err, user) {
            if (err) {
                req.flash("error", "用户不存在");
                return res.redirect('/login');
            }
            if (user.password != password) {
                req.flash("error", '密码错误');
                return res.redirect("/login");
            }
            req.session.user = user;
            req.flash("success", "登录成功");
            res.redirect("/"); //返回到主页
        });

    });
    app.get('/post', checkLogin);
    app.get('/post', function(req, res) {
        res.render('post', getStatus('发表', req));
    });

    app.post('/post', checkLogin);
    app.post('/post', function(req, res) {
        var currentUser = req.session.user,
            post = new Post(currentUser.name, req.body.title, req.body.post);
        post.save(function(err) {
            if (err) {
                req.flash("error", err);
                return res.redirect('/');
            }
            req.flash('success', '发布成功!');
            res.redirect('/'); //发表成功跳转到主页
        })
    });
    app.get('/logout', checkLogin);
    //退出操作
    app.get('/logout', function(req, res) {
        req.session.user = null;
        req.flash("success", "退出成功");
        res.redirect("/");
    });

    app.get('/upload', checkLogin);
    //显示文件上传页面
    app.get('/upload', function(req, res) {
        res.render('upload', getStatus('文件上传', req));
    });
    app.post('/upload', checkLogin);
    app.post('/upload', upload.array("field1", 5), function(req, res) {
        req.flash("success", '文件上传成功');
        res.redirect('/upload');
    });
    app.get('/u/:name', function(req, res) {
        User.get(req.params.name, function(err, user) {
            if (!user) {
                req.flash("error", "用户不存在");
                return res.redirect('/');
            }
            Post.getAll(user.name, function(err, posts) {
                if (err) {
                    req.flash("error", err);
                    return res.redirect('/');
                }
                res.render('user', {
                    title: user.name,
                    posts: posts,
                    user: req.session.user,
                    success: req.flash("success").toString(),
                    error: req.flash("error").toString()
                });
            });
        });
    });
    app.get('/u/:name/:day/:title', function(req, res) {
        Post.getOne(req.params.name, req.params.day, req.params.title, function(err, post) {
            if (err) {
                req.flash('error', err);
                return res.redirect('/');
            }
            res.render("article", {
                title: req.params.title,
                post: post,
                user: req.session.user,
                success: req.flash("success").toString(),
                error: req.flash("error").toString()
            });
        });
    });

    app.get('/edit/:name/:day/:title', checkLogin);
    app.get('/edit/:name/:day/:title', function(req, res) {
        var currentUser = req.session.user;
        Post.edit(currentUser.name, req.params.day, req.params.title, function(err, post) {
            if (err) {
                req.flash('error', err);
                return res.redirect('back');
            }
            if (post==null) {
                req.flash('error', "未查询到结果");
                return res.redirect('back');
            }
            res.render('edit', {
                title: '编辑',
                post: post,
                user: req.session.user,
                success: req.flash('success').toString(),
                error: req.flash('error').toString()
            });
        });
    });

    app.post('/edit/:name/:day/:title', checkLogin);
    app.post('/edit/:name/:day/:title', function(req, res) {
        var currentUser = req.session.user;
        Post.update(currentUser.name, req.params.day, req.params.title, req.body.post, function(err) {
            var url = encodeURI('/u/' + req.params.name + '/' + req.params.day + '/' + req.params.title);
            if (err) {
                req.flash('error', err);
                return res.redirect(url); //出错！返回文章页
            }
            req.flash('success', '修改成功!');
            res.redirect(url); //成功！返回文章页
        });
    });

    app.get('/remove/:name/:day/:title', checkLogin);
    app.get('/remove/:name/:day/:title', function(req, res) {
        var currentUser = req.session.user;
        Post.remove(currentUser.name, req.params.day, req.params.title, function(err,post) {
            if (err) {
                req.flash('error', err);
                return res.redirect('back');
            }
            console.log(post.result);
            req.flash('success', '删除成功!');
            res.redirect('/');
        });
    });

    function getStatus(title, req) {
        return {
            title: title,
            user: req.session.user,
            success: req.flash('success').toString(), //取出成功信息
            error: req.flash('error').toString() //取出错误信息
        }
    }
    //如果未登录跳转到登录页
    function checkLogin(req, res, next) {
        if (!req.session.user) {
            req.flash("error", "未登录");
            res.redirect("/login");
        }
        next();
    }
    //如果已经登录不能在访问
    function checkNotLogin(req, res, next) {
        if (req.session.user) {
            req.flash("error", "已登录");
            res.redirect("back");
        }
        next();
    }
}
