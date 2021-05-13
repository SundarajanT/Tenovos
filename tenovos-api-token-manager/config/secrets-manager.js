const AWS = require('aws-sdk'),
    region = "us-east-1";

const client = new AWS.SecretsManager({
    region: region
});

exports.awsSecretManagerService = async (secretName) => {
    return new Promise((resolve, reject) => {
        client.getSecretValue({ SecretId: secretName }, function (err, data) {
            if (err) {
                console.info(`Found error: ${err}`);
                if (err.code === 'ResourceNotFoundException')
                    console.error(`The requested secret ${secretName} was not found`);
                else if (err.code === 'InvalidRequestException')
                    console.error(`The request was invalid due to: ${err.message}`);
                else if (err.code === 'InvalidParameterException')
                    console.error(`The request had invalid params: ${err.message}`);
            } else {
                if (data.SecretString !== "") {
                    let secret_json = JSON.parse(data.SecretString);
                    resolve(secret_json);
                } else {
                    binarySecretData = data.SecretBinary;
                    reject('Unexpected binary data, exiting');
                }
            }
        });
    })
}
