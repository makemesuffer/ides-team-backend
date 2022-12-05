module.exports = {
    // Utils
    noActiveSession: 'no active session',
    sessionDestroyed: 'session destroyed',

    // Common
    featureInactive: 'feature inactive',
    requiredProps: 'required props',
    youAreNotPermittedToPerformThisAction: 'you are not permitted to perform this action',

    // 
    clickLinkBelowToConfirmNewPassword: 'click link below to confirm new password',

    //
    requestMissing: function (item) {
        return `request missing ${this[item] || item}`
    },
}