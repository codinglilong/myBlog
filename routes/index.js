var crypto = require('crypto'); //加密密码模块
var User = require('../models/user.js');
var Post = require('../models/post.js');
var multer = require("multer") //上传文件中间件
var Comment = require('../models/comment.js');
var passport = require('passport');

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
        //判断是否是第一页，并把请求的页数转换成 number 类型
        var page = parseInt(req.query.p) || 1;
        //查询并返回第 page 页的 10 篇文章
        Post.getTen(null, page, function(err, posts, total) {
            if (err) {
                posts = [];
            }
            res.render('index', {
                title: '主页',
                posts: posts,
                page: page,
                isFirstPage: (page - 1) == 0,
                isLastPage: ((page - 1) * 10 + posts.length) == total,
                user: req.session.user,
                success: req.flash('success').toString(),
                error: req.flash('error').toString()
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
    //这里我们可以直接使用 Express 的 session 功能，所以禁掉 Passport 的 session 功能
    //Passport 默认会将取得的用户信息存储在 req.user 中而不是 req.session.user，为了保持兼容
    //所以我们提取并序列化有用的数据保存到 req.session.user 中。
    app.get("/login/github", passport.authenticate("github", {session: false}));
    app.get("/login/github/callback", passport.authenticate("github", {
      session: false,
      failureRedirect: '/login',
      successFlash: '登陆成功！'
    }), function (req, res) {
      req.session.user = {name: req.user.username, head: "https://gravatar.com/avatar/" + req.user._json.gravatar_id + "?s=48"};
      res.redirect('/');
    });




    app.get('/post', checkLogin);
    app.get('/post', function(req, res) {
        res.render('post', getStatus('发表', req));
    });

    app.post('/post', checkLogin);
    app.post('/post', function(req, res) {
        var currentUser = req.session.user,
            tags = [req.body.tag1, req.body.tag2, req.body.tag3],
            post = new Post(currentUser.name, currentUser.head, req.body.title, tags, req.body.post);
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
        var page = parseInt(req.query.p) || 1;
        //检查用户是否存在
        User.get(req.params.name, function(err, user) {
            if (!user) {
                req.flash('error', '用户不存在!');
                return res.redirect('/');
            }
            //查询并返回该用户第 page 页的 10 篇文章
            Post.getTen(user.name, page, function(err, posts, total) {
                if (err) {
                    req.flash('error', err);
                    return res.redirect('/');
                }
                res.render('user', {
                    title: user.name,
                    posts: posts,
                    page: page,
                    isFirstPage: (page - 1) == 0,
                    isLastPage: ((page - 1) * 10 + posts.length) == total,
                    user: req.session.user,
                    success: req.flash('success').toString(),
                    error: req.flash('error').toString()
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
            if (post == null) {
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
        Post.remove(currentUser.name, req.params.day, req.params.title, function(err, post) {
            if (err) {
                req.flash('error', err);
                return res.redirect('back');
            }
            console.log(post.result);
            req.flash('success', '删除成功!');
            res.redirect('/');
        });
    });

    app.post('/u/:name/:day/:title', function(req, res) {
        var date = new Date(),
            time = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " +
            date.getHours() + ":" + (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes());
        var md5 = crypto.createHash('md5'),
            email_MD5 = md5.update(req.body.email.toLowerCase()).digest('hex'),
            head = "http://www.gravatar.com/avatar/" + email_MD5 + "?s=48";
        var comment = {
            name: req.body.name,
            head: head,
            email: req.body.email,
            website: req.body.website,
            time: time,
            content: req.body.content
        };
        var newComment = new Comment(req.params.name, req.params.day, req.params.title, comment);
        newComment.save(function(err) {
            if (err) {
                req.flash('error', err);
                return res.redirect('back');
            }
            req.flash('success', '留言成功!');
            res.redirect('back');
        });
    });
    app.get('/archive', function(req, res) {
        Post.getArchive(function(err, posts) {
            if (err) {
                req.flash('error', err);
                return res.redirect('/');
            }
            res.render('archive', {
                title: '存档',
                posts: posts,
                user: req.session.user,
                success: req.flash('success').toString(),
                error: req.flash('error').toString()
            });
        });
    });
    app.get('/tags', function(req, res) {
        Post.getTags(function(err, posts) {
            if (err) {
                req.flash('error', err);
                return res.redirect('/');
            }
            res.render('tags', {
                title: '标签',
                posts: posts,
                user: req.session.user,
                success: req.flash('success').toString(),
                error: req.flash('error').toString()
            });
        });
    });
    app.get('/tags/:tag', function(req, res) {
        Post.getTag(req.params.tag, function(err, posts) {
            if (err) {
                req.flash('error', err);
                return res.redirect('/');
            }
            res.render('tag', {
                title: 'TAG:' + req.params.tag,
                posts: posts,
                user: req.session.user,
                success: req.flash('success').toString(),
                error: req.flash('error').toString()
            });
        });
    });
    app.get('/search', function(req, res) {
        Post.search(req.query.keyword, function(err, posts) {
            if (err) {
                req.flash('error', err);
                return res.redirect('/');
            }
            res.render('search', {
                title: "SEARCH:" + req.query.keyword,
                posts: posts,
                user: req.session.user,
                success: req.flash('success').toString(),
                error: req.flash('error').toString()
            });
        });
    });
    app.get('/links', function(req, res) {
        res.render('links', getStatus("友情连接", req));
    });

    function getStatus(title, req) {
        return {
            title: title,
            user: req.session.user,
            success: req.flash('success').toString(), //取出成功信息
            error: req.flash('error').toString() //取出错误信息
        }
    }
    app.use(function(req, res) {
        res.render("404");
    });
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
