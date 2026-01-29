const { v4: uuidv4 } = require('uuid');

function generateRandomUser(requestParams, ctx, ee, next) {
    const uuid = uuidv4().split('-')[0];
    ctx.vars.name = `LoadUser_${uuid}`;
    ctx.vars.email = `loadtest_${Date.now()}_${uuid}@example.com`;
    return next();
}

module.exports = {
    generateRandomUser
};
