let express = require('express');
let path = require('path');
let favicon = require('serve-favicon');
let cookieParser = require('cookie-parser');
let bodyParser = require('body-parser');
const User = require('./models/users');
let morgan = require('morgan');
let session = require('express-session');
let passport = require('passport');
let hbs  = require('express-handlebars');
const cors = require('express-cors');
const config = require('./config/index');
const authController = require('./auth/auth.controller');
const Util = require('./lib/utils');
let _ = require('lodash');

//mongodb
let mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
mongoose.connect(config.mongodb, { useNewUrlParser: true });
let MongoStore = require('connect-mongo')(session);

let app = express();

app.engine('handlebars', hbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());

//Express-session
app.use(session({
    secret: 'holasec',	
    resave: false,
    saveUninitialized: false,  //true if we want to track returning users
    store: new MongoStore({ mongooseConnection: mongoose.connection })
}));

//Passport config
app.use(passport.initialize());
app.use(passport.session());
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});


//app.use(morgan('combined', {stream: require('./lib/logger').stream}));
app.use(morgan(':req[X-Forwarded-For] - - [:date] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"', {stream: require('./lib/logger').stream}));
app.use(function (req, res, next) {
    if (req.user) {
        let currentIP = req.headers["x-forwarded-for"];
        let userIPs = req.user.data.ip || [];

        //push current IP
        if (currentIP && userIPs.indexOf(currentIP) === -1) {
            req.user.data.ip.push(currentIP);
        }
        // else {
        //     req.user.data.ip.push('106.51.66.119');
        // }

        //resolve location
        if (req.user.data.ip) {
            req.user.data.ip = _.compact(req.user.data.ip);
            req.user.location = authController.ipToLocation(req.user.data.ip);
        }
        authController.updateUserMiddleWare(req.user, (err, result) => {});
    }
    next();
});
app.use(function (req, res, next) {
    req.url = Util.decodeHolaLink(req.url);
    next();
});

app.use('/', require('./routes'));
app.use('/auth', require('./auth/index'));
app.use('/api/profile', require('./api/profile/index'));
app.use('/api/search', require('./api/search/index'));
app.use('/api/shortlist', require('./api/shortlist/index'));
app.use('/api/account', require('./api/account/index'));
app.use('/api/company', require('./api/company/index'));
app.use('/api/optout', require('./api/optout/index'));


// /* GET static pages. */


//catch 404 and forward to error handler
// app.use(function(req, res, next) {
//   //res.status(404).send('Not Found!');
//   res.redirect('404');
//   //next();
// });

module.exports = app;
