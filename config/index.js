var path = require('path');
var env = process.env.NODE_ENV || 'development';

let config = {
    development: {
        port: 7000,
        env: env,
        profileAPI: 'http://holaconnect.com:8388/api/profile',
        elasticIndex: 'evenrank-all',
        elasticCelebIndex: 'evenrank-celeb',
        elasticType: 'profile',
        JWTsecret: 'test',
        mongodb: "mongodb://localhost:27017/hola-dev"
    },

    production: {
        port: 7000,
        env: env,
        profileAPI: 'http://localhost:8388/api/profile',
        elasticIndex: 'evenrank-all',
        elasticCelebIndex: 'evenrank-celeb',
        elasticType: 'profile',
        JWTsecret: 'test',
        mongodb: "mongodb://localhost:27017/hola-prod"
    }
}
module.exports = config[env];
