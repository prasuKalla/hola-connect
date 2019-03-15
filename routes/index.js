let express = require('express');
let Logger = require('../lib/logger');
const Account = require('../models/accounts');
let searchController = require('../api/search/search.controller');
let profileController = require('../api/profile/profile.controller');
let companyController  =require('../api/company/company.controller');
let designationController   =   require('../api/designation/designation.controller');
const router = express.Router();
const Config = require('../config/index');
const request = require('request');




router.use(function (req, res, next) {
    if (req.isAuthenticated() && req.user) {
        Account.findOne({userId: req.user._id}).exec()
            .then(function (account) {

                let sohoStatus=false, proStatus=false, subscribed=false;

                if(account.expiryAt>Date.now() && account.subscriptionId === "holaconnect-soho"){
                    sohoStatus=true;

                }else if(account.expiryAt>Date.now() && account.subscriptionId === "holaconnect-pro"){
                    proStatus=true;

                }
                if(account.subscriptionId === 'holaconnect-pro' || account.subscriptionId === 'holaconnect-soho' && account.expiryAt >= Date.now()){
                    subscribed=true;
                }

                let expiryAt = new Date(account.expiryAt);
                expiryAt = expiryAt.getDate() + '/' + (expiryAt.getMonth() + 1) + '/' + expiryAt.getFullYear();


                req.userInfo = {
                    name: req.user.name,
                    creditLeft: account.credit,
                    expiryAt:expiryAt,
                    extensionEnabled: req.user.data.extensionEnabled,
                    sohoStatus:sohoStatus,
                    proStatus:proStatus,
                    subscriptionStatus:account.subscriptionStatus,
                    subscribed:subscribed

                };
                next();
            })
            .catch(function (err) {
                Logger.error(err);
                res.status(500).json({message: 'Internal Server Error'});
            });


    } else {
        next();
    }
});

/**
 * Main Portal Routes
 */

router.get('/', function (req, res) {
    res.render('home', {userInfo: req.userInfo, cdnEnable: Config.cdnEnable, hideSearch: false});
});

router.get('/search', function (req, res) {
    searchController.searchProfile(req, res);
    // let options = {
    //   userInfo:req.userInfo,
    //   cdnEnable:Config.cdnEnable,
    //   searchNav:true,
    //   basicQuery:req.query.q
    // };
    // res.render('search',options);
});

router.get('/profile/:link', function (req, res) {
    profileController.showProfile(req, res);
    // let options = {
    //   userInfo:req.userInfo,
    //   cdnEnable:Config.cdnEnable,
    // };
    // res.render('profile',options);
});

/*
router.get('/pricing', function (req, res, next) {
    if (req.isAuthenticated()) {
        res.render('pricing', {userInfo: req.userInfo, loggedIn: true, cdnEnable: Config.cdnEnable});
    }
    else {
        res.render('pricing', {userInfo: req.userInfo, loggedIn: false, cdnEnable: Config.cdnEnable});
    }

});
*/
router.get('/directory/company',function (req,res) {

    companyController.findCompany(req,res);
});

router.get('/directory/designation',function (req,res) {

    designationController.findDesignations(req,res);
});



router.get('/directory/city',function (req,res) {

    res.render('city', {userInfo: req.userInfo, loggedIn: false, cdnEnable: Config.cdnEnable});
});

router.get('/login', function (req, res) {
    res.render('login', {redirectTo: req.query.redirectTo, cdnEnable: Config.cdnEnable});
});

router.get('/mycontacts', function (req, res) {
    if (req.isAuthenticated()) {
        res.render('dashboard', {userInfo: req.userInfo, cdnEnable: Config.cdnEnable});
    } else {
        res.redirect('/');
    }
});


router.get('/extension', function (req, res, next) {
    res.render('extension', {userInfo: req.userInfo, cdnEnable: Config.cdnEnable});
});
router.get('/faq', function (req, res) {
    res.render('faq', {userInfo: req.userInfo, cdnEnable: Config.cdnEnable});
});

router.get('/privacy', function (req, res) {
    res.render('privacy', {userInfo: req.userInfo, cdnEnable: Config.cdnEnable});
});

router.get('/optout', function (req, res) {
    res.render('optout', {userInfo: req.userInfo, cdnEnable: Config.cdnEnable});
});

router.get('/business', function (req, res) {
    res.render('business', {userInfo: req.userInfo, cdnEnable: Config.cdnEnable});
});


router.get('/refund', function (req, res) {
    res.render('refund', {userInfo: req.userInfo, cdnEnable: Config.cdnEnable});
});

router.get('/contact', function (req, res) {
    res.render('contactus', {userInfo: req.userInfo, cdnEnable: Config.cdnEnable});
});


router.post('/contact', function (req, res) {
    let token = req.body["g-recaptcha-response"] || "";

    if (!token) {
        res.redirect('/contact?message=Captcha Not selected');
    } else {
        verifyCaptcha(token)
            .then(function (x) {
                let name = req.body.name;
                let message = req.body.message;
                let email = req.body.email;
                let phone = req.body.phone;
                let subject = req.body.subject;
                if (!name || !email || !subject || !phone || !message) {
                    return res.redirect('/contact?message=All fields are required');
                }
                else {
                    Mailer.contactUs(req.body);
                    return res.redirect('/contact?message=Thank you for contacting Us. Someone will get back to you within the next 48 hours');
                }
            })
            .catch(function (err) {
                res.redirect('/contact?message=Captcha is Not valid');

            })
    }
});



router.get('/payment', function (req, res) {
    res.render('payment', {userInfo: req.userInfo, cdnEnable: Config.cdnEnable});
});

function verifyCaptcha(token) {
    return new Promise(function (resolve, reject) {
        let options = {
            url: "https://www.google.com/recaptcha/api/siteverify",
            method: "POST",

            formData: {
                secret: "6LdMPBsUAAAAAD_5GJpY0epMvWR6oihnEFQkJquo",
                response: token
            }
        };
        request(options, function (error, response, body) {
            if (!error && body) {
                let res = JSON.parse(body);
                if (res && res.success) {
                    resolve(res.success);
                } else {
                    reject(error);
                }
            } else {
                reject(error);
            }
        })
    });
}

router.post('/contact', function (req, res) {
    let token = req.body["g-recaptcha-response"] || "";

    if (!token) {
        res.redirect('/contact?message=Captcha Not selected');
    } else {
        verifyCaptcha(token)
            .then(function (x) {
                exec();
            })
            .catch(function (err) {
                res.redirect('/contact?message=Captcha is Not valid');

            })
    }


    function exec() {
        let name = req.body.name;
        let message = req.body.message;
        let email = req.body.email;
        let phone = req.body.phone;
        let subject = req.body.subject;

        if (!name || !email || !subject || !phone || !message) {
            res.redirect('/contact?message=All fields are required');
            // return res.status(200).json({message: 'All fields are required'});
        }
        let content = "name: '" + name + "',email: '" + email + "',phone: '" + phone + "',message:'" + message + "',subject:'" + subject + "'";
        Mailer.contactUs(content);

        res.redirect('/contact?message=Thank you for contacting Us. Someone will get back to you within the next 48 hours');
        // res.status(200).json({mesage: "Mail Sent"});

    }

});

router.get('/logout', function (req, res, next) {
    req.logout();
    req.session.destroy(function (err) {
        res.clearCookie('connect.sid');
        res.clearCookie('token');
        res.redirect('/'); //Inside a callback… bulletproof!
    });
});


router.get('/404', function (req, res) {
    res.status(404);

    // respond with html page
    if (req.accepts('html')) {
        res.render('404');
        return;
    }

    // respond with json
    if (req.accepts('json')) {
        res.send({error: 'Not found'});
        return;
    }

    // default to plain-text. send()
    res.type('txt').send('Not found');
});

// catch 404 and forward to error handler
// app.use(function(req, res, next) {
//   //res.status(404).send('Not Found!');
//   res.redirect('404');
//   //next();
// });

module.exports = router;
