/**
 * Created by rakesh on 19/6/17.
 */

"use strict";

const express = require('express');

const Companies = require('../../models/companies');

const Logger = require('../../lib/logger');
const Util = require('../../lib/utils');
const Config = require('../../config/index');
const _ = require('lodash');
const fs = require('fs');

function findCity(req, res) {
    let queryreq=req.query.text;
    if(!queryreq){

        return res.render('city');
    }else{

        let page    =req.query.page || 0;
        let skip=page*40;
        var regexp = new RegExp("^" + queryreq, "i");

        Companies.find({name: regexp},{_id:0},function (err, CompaniesItem) {
            if (err) {
                res.status(500).json({msg:'something went wrong'})
            }else{
                let exist=false;
                if(CompaniesItem.length>0){
                    exist=true
                }
                let resultSet = {
                    userInfo: req.userInfo,
                    companies: CompaniesItem,
                    exist:exist,
                    text:true
                };
                return res.render('city',{companies:CompaniesItem, exist:exist,text:true});
                // res.status(200).json({companies:CompaniesItem})
            }
        }).skip(skip).limit(40);
    }

}
module.exports = {

    findCity:findCity
}
