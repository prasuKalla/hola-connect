"use strict";

const mongoose = require('mongoose');
let Schema = mongoose.Schema;

let placesSchema = new Schema({
    formatted_address: {type: String},
    place_id: {type: String},
    location: {type: String, required: true},
    clean_address: {type: String},
    wiki_summary: {type: String}
});

let Places = mongoose.model('Place', placesSchema);
module.exports = Places;