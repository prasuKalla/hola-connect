/**
 * Created by rakesh on 19/6/17.
 */
"use strict";

const Designations = require('../../models/designations');

function findDesignations(req, res) {

        let page = req.query.page || 0;
        let skip = page * 40;


        Designations.find({},null, {sort:{_id:1}},function (err, DesignationItems) {
            if (err) {
                res.status(500).json({msg: 'Internal Server Error'})
            } else {
                let resultSet = {
                    userInfo: req.userInfo,
                    designation: DesignationItems,
                    exist:DesignationItems.length,
                    text:true
                };

                return res.render('designation', resultSet);
            }
        }).skip(skip).limit(40);


}
module.exports = {
    findDesignations: findDesignations
};
