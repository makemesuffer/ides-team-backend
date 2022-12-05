const faker = require("faker");
const moment = require("moment");

module.exports = {
  date: {
    utc: (passedDate) => {
      const date = passedDate
        ? new Date(passedDate)
        : new Date(moment().utcOffset(0).valueOf());
      const utc = date.getTime().toString();

      return utc;
    },
    utcNumber: (passedDate) => {
      const date = passedDate
        ? new Date(passedDate)
        : new Date(moment().utcOffset(0).valueOf());
      const utc = date.getTime().toString();

      return parseInt(utc);
    },
    yearMonthDate: (passedDate) => {
      const date = passedDate
        ? new Date(passedDate)
        : new Date(moment().utcOffset(0).valueOf());
      const ymd = `${date.getFullYear()}:${date.getMonth()}:${date.getDate()}`;

      return ymd;
    },
    ymd: function (utc) {
      return this.yearMonthDate(utc);
    },
  },
  string: {
    capFirst: (string) => {
      return string[0].toUpperCase() + string.slice(1, string.length);
    },
    cap: function (string) {
      const hasWords = string.split(" ").length > 1;
      if (hasWords)
        return string
          .split(" ")
          .map((w) => this.capFirst(w))
          .join(" ");

      return this.capFirst(string);
    },
  },
  random: {
    integer: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
    integerWithLength: (length) => {
      return Math.floor(
        Math.pow(10, length - 1) +
          Math.random() * (Math.pow(10, length) - Math.pow(10, length - 1) - 1)
      );
    },
    address: () => faker.address.streetAddress(),
    message: () => faker.lorem.paragraph(),
    word: () => faker.random.word(),
    findName: () => faker.name.findName(),
  },
  type: {
    isBoolean: (val) => "boolean" === typeof val,
  },
  object: {
    findDeep: (obj, key, falsy) => {
      if (_.has(obj, key)) return [obj];
      if (falsy && !_.has(obj, key)) return [obj];

      return _.flatten(
        _.map(obj, function (v) {
          return typeof v == "object"
            ? Utils.object.findDeep(v, key, falsy)
            : [];
        }),
        true
      );
    },
    flattenObject: (obj) => {
      const result = {};
      for (let i in obj) {
        if (!obj.hasOwnProperty(i)) continue;

        if (typeof obj[i] == "object") {
          let flatObject = Utils.object.flattenObject(obj[i]);

          for (let x in flatObject) {
            if (!flatObject.hasOwnProperty(x)) continue;
            result[i + "." + x] = flatObject[x];
          }
        } else {
          result[i] = obj[i];
        }
      }
      return result;
    },
    dotsToBrackets: (path) => {
      return path.replace(/\.(.+?)(?=\.|$)/g, (m, s) => `[${s}]`);
    },
  },
};
