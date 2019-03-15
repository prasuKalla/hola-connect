/**
 * Created by rakesh on 15/6/17.
 */
"use strict";

const Companies = require('../../models/companies');

function findCompany(req, res) {

    let page = req.query.page || 0;
    let skip = page * 40;

        Companies.find({},{},function (err, CompaniesItem) {
            if (err) {
                res.status(500).json({msg:'something went wrong'})
            }else{
                return res.render('company', {
                    userInfo: req.userInfo,
                    companies: CompaniesItem,
                    exist:CompaniesItem.length,
                    text:true
                });
            }
        }).skip(skip).limit(40);
}

module.exports = {
    findCompany:findCompany
};
