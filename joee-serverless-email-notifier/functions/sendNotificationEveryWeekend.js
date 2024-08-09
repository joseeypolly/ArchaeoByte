'use strict';
const secrets = require('../secrets.json')

module.exports.handler = (event, context, callback) => {

    var AWS = require('aws-sdk');
    AWS.config.update({
        region: secrets.awsRegion
    });
    var ses = new AWS.SES();

    var toAndFromAdress = secrets.email
    var params = {
        Destination: {
            ToAddresses: [toAndFromAdress]
        },
        Message: {
            Body: {
                Text: {
                    Charset: "UTF-8",
                    Data: "Super simple notification only on weekends :) !"
                }
            },
            Subject: {
                Charset: "UTF-8",
                Data: "Weekend reminder from Eduard Bargués"
            }
        },
        ReplyToAddresses: [toAndFromAdress],
        Source: toAndFromAdress,
    };

    ses.sendEmail(params, (err, data) => {
        if (err) console.log(err, err.stack);
        else callback(null, data);
    });
};