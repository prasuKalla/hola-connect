"use strict";
let jwt = require('jsonwebtoken');
let config = require('../config');
let moment = require('moment');
let User = require('../models/users');
const ip2loc = require("ip2location-nodejs");

let ensureAuth = (req, res, next) => {
  if (req.isAuthenticated()) {

    return next();
  } else {
    return res.status(401).send({message: 'Unauthorized!'});
  }
};

/**
 * Returns a jwt token signed by the app secret
 */
function signToken(id) {
  return jwt.sign({_id: id}, config.JWTsecret, {expiresIn: '7d'});
}

/**
 * Set token cookie directly for oAuth strategies
 */
function setTokenCookie(req, res) {
    if (!req.user) return res.status(404).json({message: 'Something went wrong, please try again.'});
    let token = signToken(req.user._id, req.user.role);
    res.cookie('token', token);
    let redirect = '';
    if (req.session.redirectTo)
        redirect = req.session.redirectTo;

    else if (req.session.redirectToExtension)
        redirect = req.session.redirectToExtension;

    else
        redirect = '/';
    res.redirect(redirect);
}

const verifyToken = function (req, res, next) {
    if (!(req.cookies && req.cookies.token) && !req.header('Authorization')) {
        return res.status(401).send({message: 'Please make sure your request has an Authorization header'});
    }

    else {
        let token = req.cookies.token || req.header('Authorization').split(' ')[1];
        let payload = null;
        try {
            payload = jwt.decode(token, config.JWTsecret);
            if (payload.exp <= moment().unix()) {
                return res.status(401).send({message: 'Token has expired'});
            }
            else {
                User.findById(payload._id, function (err, user) {
                    if (err) {
                        return res.status(404).json({message: "User not found"});
                    } else if (user) {
                        req.user = user;
                        return next();
                    } else {
                        return res.status(401).json({message: "Unauthorized"});
                    }
                });
            }
        }
        catch (err) {
            return res.status(401).send({message: err.message});
        }
    }

};

function updateUserMiddleWare(userObject, cb) {
  userObject.save((err) => {
        if (err) {
            cb(err);
        }
        else {
            cb(null, true);
        }
    });
}

function getUserMiddleWare(userId, cb) {
    User.findOne(userId, (err, response) => {
      if(err ) {
        return cb(err);
      }
      else {
        return cb(null, response);
      }
    })
}

function ipToLocation(ipArray) {
    ip2loc.IP2Location_init(process.cwd() + "/auth/IP2LOCATION-LITE-DB1.BIN");
    let countryCode, country;
    if (ipArray.length > 0) {
        let ip = ipArray[ipArray.length - 1];
        ip = ip.split(',').pop().trim();
        let location = ip2loc.IP2Location_get_all(ip);
        countryCode = location.country_short;
        country = location.country_long
    }

    return {countryCode: countryCode, country: country}
}

    module.exports = {
    ensureAuth: verifyToken,
    setTokenCookie: setTokenCookie,
    updateUserMiddleWare: updateUserMiddleWare,
    getUserMiddleWare: getUserMiddleWare,
    ipToLocation: ipToLocation
};
