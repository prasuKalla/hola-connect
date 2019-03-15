"use strict";

const express = require('express');
const User = require('../../models/users');

const Account = require('../../models/accounts');
const Subscription = require('../../models/subscriptions');

const Logger = require('../../lib/logger');
const Util = require('../../lib/utils');
const Config = require('../../config/index');
const _ = require('lodash');
const fs = require('fs');
const request = require('request');

let updateUserAccountMiddleWare = (user,additionalCredit) => {
    let userId = user._id;
    Account.findOne({userId: userId})
        .exec((err, accountItem) => {
            if (err) {
                Logger.error("db error on account fetch %s",Util.prettyPrint(err));
            }
            else if(!accountItem){
                Logger.error("no account for %s",userId);
            }
            else{
                accountItem.credit = accountItem.credit+ additionalCredit;
                accountItem.save((err) => {
                    if (err)
                        Logger.error("credit update failed during for %s", user.email);
                    else
                        Logger.info("credits updated for user %s",user.email);
                });
            }
        });
};

// create a accounts document for user who signing up for first time
let createAccount = (userObject, next) => {
    //let userId = req.body.user._id;
    let userId = userObject._id;

    Subscription.findOne({_id: 'holaconnect-free'}).exec((err, subscriptionItem) => {
        if (err) {
            return next(err);
        }
        else if (!subscriptionItem) {
            return next(err);
        }
        else {
            //calculate expiry date for new account
            let dateNow = new Date();
            dateNow.setDate(dateNow.getDate() + subscriptionItem.expiryDays);
            let expiryAt = dateNow.getTime();

            //save new account object
            let newAccount = new Account();
            newAccount.userId = userId;
            newAccount.credit = subscriptionItem.credit;
            newAccount.expiryAt = expiryAt;
            newAccount.subscriptionId = subscriptionItem._id;
            newAccount.save((err, accountItem) => {
                if (err){
                    Logger.error("db error on account create %s",Util.prettyPrint(err));
                    return next(err);
                }
                Logger.info("account created for user with id %s", userId);
                return next(null,accountItem);
            });
        }
    });
};

let getUserAccount = (req, res, next) => {
    let userId = req.user._id;
    Account.findOne({userId: userId})
    //.populate('subscriptionId' , 'pastCredit')
        .exec((err, accountItem) => {
            if (err) {
                Logger.error("db error on account fetch %s",Util.prettyPrint(err));
                return res.status(500).send({message: "db error"});
            }
            else if(!accountItem){
                Logger.error("no account for %s",userId);
                return res.status(404).send({message: "no account"});
            }
            else{
                let accountResult = {};
                //credits valid
                if (accountItem.expiryAt >= Date.now()  && accountItem.credit > 0)
                {
                    accountResult.creditLeft = accountItem.credit;
                    accountResult.expiryAt = accountItem.expiryAt;
                }
                else
                {
                    accountResult.creditLeft = 0;
                    accountResult.expiryAt = "expired";
                }
                return res.status(200).send(accountResult);
            }
        });
};

let getUserAccountMiddleware = (req, res, cb) => {
    let result = {
        creditLeft: 0,
        expiryAt: 0,
        subscriptionId: null
    };


    if (req.user) {
        let userId = req.user._id;
        Account.findOne({userId: userId})
        //.populate('subscriptionId' , 'pastCredit')
            .exec((err, accountItem) => {
                if (err) {
                    Logger.error("db error on account fetch %s", Util.prettyPrint(err));
                    return cb(result);
                }
                else if (!accountItem) {
                    Logger.error("no account for %s", userId);
                    return cb(result);
                }
                else {
                    //credits valid
                    if (accountItem.expiryAt >= Date.now() && accountItem.credit > 0) {
                        result.creditLeft = accountItem.credit;
                        result.expiryAt = accountItem.expiryAt;
                        result.subscriptionId = accountItem.subscriptionId;
                    }
                    else {
                        result.creditLeft = 0;
                        result.expiryAt = "expired";
                        result.subscriptionId = accountItem.subscriptionId;
                    }
                    return cb(result);
                }
            });
    }
    else {
        return cb(result);
    }

};

function cancelSubscriptionRequest(subscriptionId){

    return new Promise(function (resolve,reject) {
        request({
            url: Config.zoho.subscriptionUrl + '/subscriptions/'+subscriptionId+'/cancel?cancel_at_end=true',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json;charset=UTF-8',
                'X-com-zoho-subscriptions-organizationid': Config.zoho.orgId,
                'Authorization': 'Zoho-authtoken ' + Config.zoho.authToken
            }

        }, function (error, response, results) {
            if (error) {
                reject(error);
            } else {

                resolve(response);

            }


        })

    })
}
let cancelSubscription  = (req,res)  =>{
    let userId = req.user._id;
    Account.findOne({userId: userId})
        .exec((err, accountItem) => {
            if (err) {
                Logger.error("db error on account fetch %s",Util.prettyPrint(err));
                res.status(500).json({message:'Something went wrong'})
            }
            else if(!accountItem){
                Logger.error("no account for %s",userId);
                res.status(404).json({message:'Subscription not found'})
            }
            else if(!accountItem.subscriptionId){
                Logger.error("no subscription Id  for %s",userId);
                res.status(404).json({message:'Subscription not found'})
            }
            else{
                cancelSubscriptionRequest(accountItem.subscriptionId)
                    .then(function (resp) {
                        let body=JSON.parse(resp.body);
                        accountItem.subscriptionStatus=false;
                        accountItem.save((err) => {
                            if (err) {
                                Logger.error("subscription cancelled but failed to update account %s",accountItem.subscriptionId);
                                //send callback after 10 seconds

                            }
                            if(body.message){
                                res.status(200).json({message:body.message})
                            }else{
                                res.status(200).json({message:body['subscription'].message})
                            }

                        })

                    }).catch(function (err) {
                    Logger.error("error while canceling for user %s",err);
                    res.status(500).json({message:'Something went wrong,please contact us at support@holaconnect.com'})
                })
            }
        });



}
module.exports = {
    getUserAccount: getUserAccount,
    getUserAccountMiddleware: getUserAccountMiddleware,
    updateUserAccountMiddleWare: updateUserAccountMiddleWare,
    createAccount: createAccount,
    cancelSubscription:cancelSubscription
};
