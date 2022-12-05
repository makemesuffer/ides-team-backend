module.exports.bootstrap = async function (cb) {
  try {
    await Boot.getInstanceId();
    sails.log.info("BOOTSTRAP: got instance id");

    // await Sockets.maintain();
    // sails.log.info("BOOTSTRAP: ran sockets maintain");

    await Boot.prepareDb();
    sails.log.info("BOOTSTRAP: gonna call callback");

    cb();
  } catch (e) {
    sails.log.error(e);
  }
};
