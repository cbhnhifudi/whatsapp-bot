const { join } = require('path');

/**
 * @type {import('puppeteer').Configuration}
 */
module.exports = {
    // מגדיר תיקיית קאש קבועה בתוך הפרויקט עצמו
    cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};