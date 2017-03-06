var context = require.context('.', true, /-spec\.[t|j]s$/);
context.keys().forEach(context);
module.exports = context;
