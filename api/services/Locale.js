const text = require('../../config/locales/')

module.exports = (req) => {
    // in case if locale was passed explicitly
    if (typeof req === 'string') return text[req]

    // regular locale check
    const locale = req.getLocale()
    if (text[locale]) return text[locale]
    return text.en
}
