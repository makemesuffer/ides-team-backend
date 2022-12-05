const shortid = require('shortid')
const _ = require('lodash')
const { Constants } = sails.config.globals

module.exports = {

    attributes: {
        type: {
            type: 'string',
            enum: [Constants.email, Constants.socketChat],
            required: true
        },
        content: {
            type: 'json',
            defaultsTo: {},
            required: true
        },
        additionalInfo: {
            type: 'json',
            defaultsTo: {}
        },
        // meta
        institutionId: {
            required: true,
            type: 'string'
        },
        messageId: {
            type: 'string'
        },
        utc: {
            type: 'string'
        },
        ymd: {
            type: 'string'
        }
    },

    // lifecycle

    beforeCreate: (message, next) => {
        message.messageId = shortid.generate()
        message.utc = Utils.date.utc()
        message.ymd = Utils.date.ymd()

        next()
    },

    afterCreate: async (createdRecord, next) => {
        try {
            if (createdRecord.type === Constants.email) {
                const subject = _.get(createdRecord, 'content.subject')
                const to = _.get(createdRecord, 'content.to')
                const text = _.get(createdRecord, 'content.text')

                if (subject && to && text) {
                    await Mail.send(to, subject, text)
                }
            }

            if (createdRecord.type === Constants.socketChat) {
                const chatId = _.get(createdRecord, 'content.chatId')
                const leftBy = _.get(createdRecord, 'content.leftBy')
                const text = _.get(createdRecord, 'content.text')

                if (chatId && leftBy && text) {
                    Sockets.broadcast(
                        [Sockets.makeRoomName(createdRecord.institutionId, Constants.chats, chatId)],
                        Constants.messageCreated,
                        createdRecord
                    )
                }

                const chatToReceiveUpdate = await Chats.findOne({ chatId })
                if (chatToReceiveUpdate) await Chats.fillIn({ chatId }, { messages: [...chatToReceiveUpdate.messages, createdRecord.messageId] })
            }

            next()
        } catch (e) {
            next(e)
        }
    },

    afterUpdate: async (updatedRecord, next) => {
        try {
            if (updatedRecord.type === Constants.socketChat) {
                const chatId = _.get(updatedRecord, 'content.chatId')

                Sockets.broadcast([Sockets.makeRoomName(updatedRecord.institutionId, Constants.chats, chatId)],
                    Constants.messageUpdated,
                    updatedRecord
                )
            }

            next()
        } catch (e) {
            next(e)
        }
    },

    afterDestroy: async (destroyedRecords, next) => {
        try {
            const processReqs = []

            for (let i = 0; i < destroyedRecords.length; i++) {
                processReqs.push(new Promise(async (resolve, reject) => {
                    const record = destroyedRecords[i]

                    if (record.type === Constants.socketChat) {
                        const chatId = _.get(record, 'content.chatId')

                        Sockets.broadcast([Sockets.makeRoomName(record.institutionId, Constants.chats, chatId)],
                            Constants.messageDeleted,
                            record
                        )

                        const chatToReceiveUpdate = await Chats.findOne({ chatId })
                        if (chatToReceiveUpdate) await Chats.fillIn({ chatId }, {
                            messages: [...chatToReceiveUpdate.messages.filter(id => id !== record.messageId)]
                        }).catch(e => reject(e))
                    }

                    resolve()
                }))
            }

            await Promise.all(processReqs)
            next()
        } catch (e) {
            next(e)
        }
    },

    // repository

    fetch: async (query = {}) => {
        try {
            let params = {}

            if (query.filter) params.where = query.filter
            if (query.limit) params.limit = Number(query.limit)
            if (query.skip) params.skip = Number(query.skip)

            params.sort = `${_.get(query, 'sort.by', 'utc')} ${_.get(query, 'sort.asc', 'DESC')}`
            let records = await NativeQuery.find(Messages, params.where, { ...params })

            if (query.populate) records = await Promise.all(records.map(r => Messages.populate(r)))
            return { success: true, reason: records }
        } catch (e) {
            return { success: false, reason: e }
        }
    },

    fillIn: async (filter, props) => {
        try {
            if (props.populated) throw new Error('doNotFillInPopulated')

            const records = await NativeQuery.find(Messages, filter)
            if (!records.length) return { success: false, reason: 'noRecordsFound' }
            const updateReqs = []

            records.forEach(r => updateReqs.push(new Promise(async (resolve, reject) => {
                Object.keys(props).forEach(path => _.set(r, path, props[path]))

                const updated = await Messages.update({ messageId: r.messageId }, { ...r }).catch(e => reject(e)) || []
                resolve(updated.length === 1 ? updated[0] : updated)
            })))

            const result = await Promise.all(updateReqs)
            return { success: true, reason: result.length == 1 ? result[0] : result }
        } catch (e) {
            return { success: false, reason: e }
        }
    },

    populate: async (record) => {
        try {
            let populated = { ...record, populated: true }
            return populated
        } catch (e) {
            return { success: false, reason: e }
        }
    },

    getRelated: async (record) => {
        const criteria = { messageId: record.messageId }

        const related = {
        }

        return related
    },

    // validation

    validateCreate: async (req, message) => {
        try {
            const checkRules = _.omit(Messages.commonRules(req, message, 'create'), ['boundToDestroy'])
            const failedChecks = {}
            const checks = []

            for (const prop in {
                ...checkRules,
                ...message,
            }) {
                if (checkRules[prop]) {
                    checks.push(new Promise(async (resolve) => {
                        const test = await checkRules[prop].test()
                        if (Utils.type.isBoolean(test) && test) return resolve()

                        const { success, reason } = test
                        if (success) return resolve()

                        failedChecks[prop] = { warning: checkRules[prop].warning }
                        if (reason) failedChecks[prop] = { ...failedChecks[prop], ...reason }

                        resolve({ ...failedChecks[prop] })
                    }))
                }
            }

            await Promise.all(checks)
            if (Object.keys(failedChecks).length) return { success: false, reason: failedChecks }

            return { success: true }
        } catch (e) {
            return { success: false, reason: e }
        }
    },

    validateUpdate: async (req, filter, props) => {
        try {
            const records = await NativeQuery.find(Messages, filter)
            if (!records.length) return { success: false, reason: 'noRecordsFound' }

            const allValidations = []
            records.forEach((r) => allValidations.push(new Promise(async (resolve) => {
                const checkRules = _.omit(Messages.commonRules(req, { ...r, ...props }, 'update'), ['boundToDestroy'])
                const failedChecks = {}
                const checks = []

                for (const prop in {
                    ...checkRules,
                    ...props,
                }) {
                    if (checkRules[prop]) {
                        checks.push(new Promise(async (resolve) => {
                            const test = await checkRules[prop].test()
                            if (Utils.type.isBoolean(test) && test) return resolve()

                            const { success, reason } = test
                            if (success) return resolve()

                            failedChecks[prop] = { warning: checkRules[prop].warning }
                            if (reason) failedChecks[prop] = { ...failedChecks[prop], ...reason }

                            resolve({ ...failedChecks[prop] })
                        }))
                    }
                }

                await Promise.all(checks)
                if (Object.keys(failedChecks).length) return resolve({ failedChecks, messageId: r.messageId })
                resolve({ success: true })
            })))

            const result = await Promise.all(allValidations)
            const recordsWithFailedChecks = result.filter(r => !r.success)

            if (recordsWithFailedChecks.length) return {
                success: false,
                reason: recordsWithFailedChecks.length == 1 ? recordsWithFailedChecks[0].failedChecks : recordsWithFailedChecks
            }
            return { success: true }
        } catch (e) {
            return { success: false, reason: e }
        }
    },

    validateDestroy: async (req, messageId) => {
        try {
            const message = await Messages.findOne({ messageId })
            if (!message) return { success: false, reason: 'noRecordsFound' }

            const checkRules = _.pick({ ...Messages.commonRules(req, message, 'delete') }, ['accessRights', 'boundToDestroy'])
            const failedChecks = {}
            const checks = []

            for (const prop in {
                ...checkRules
            }) {
                if (checkRules[prop]) {
                    checks.push(new Promise(async (resolve) => {
                        const test = await checkRules[prop].test()
                        if (Utils.type.isBoolean(test) && test) return resolve()

                        const { success, reason } = test
                        if (success) return resolve()

                        failedChecks[prop] = { warning: checkRules[prop].warning }
                        if (reason) failedChecks[prop] = { ...failedChecks[prop], ...reason }

                        resolve({ ...failedChecks[prop] })
                    }))
                }
            }

            await Promise.all(checks)
            if (Object.keys(failedChecks).length) return {
                success: false,
                reason: failedChecks
            }
            return { success: true }
        } catch (e) {
            return { success: false, reason: e }
        }
    },

    validateList: async (req, query) => {
        try {
            const records = await NativeQuery.find(Messages, query.filter)

            const allValidations = []
            records.forEach((r) => allValidations.push(new Promise(async (resolve) => {
                const checkRules = _.pick({ ...Messages.commonRules(req, r, 'list') }, ['accessRights'])
                const failedChecks = {}
                const checks = []

                for (const prop in {
                    ...checkRules
                }) {
                    if (checkRules[prop]) {
                        checks.push(new Promise(async (resolve) => {
                            const test = await checkRules[prop].test()
                            if (Utils.type.isBoolean(test) && test) return resolve()

                            const { success, reason } = test
                            if (success) return resolve()

                            failedChecks[prop] = { warning: checkRules[prop].warning }
                            if (reason) failedChecks[prop] = { ...failedChecks[prop], ...reason }

                            resolve({ ...failedChecks[prop] })
                        }))
                    }
                }

                await Promise.all(checks)
                if (Object.keys(failedChecks).length) return resolve({ failedChecks, messageId: r.messageId })
                resolve({ success: true })
            })))

            const result = await Promise.all(allValidations)
            const recordsWithFailedChecks = result.filter(r => !r.success)

            if (recordsWithFailedChecks.length) return {
                success: false,
                reason: recordsWithFailedChecks.length == 1 ? recordsWithFailedChecks[0].failedChecks : recordsWithFailedChecks
            }
            return { success: true }
        } catch (e) {
            return { success: false, reason: e }
        }
    },

    commonRules: (req, message, action) => {
        return {
            boundToDestroy: {
                test: () => new Promise(async (resolve) => {
                    if (req.params.force) return resolve(true)

                    const related = await Messages.getRelated(message)
                    const bound = _.pickBy(related, v => v.length)
                    if (Object.keys(bound).length) return resolve({ success: false, reason: { dependentRecords: bound } })

                    resolve({ success: true })
                }),
                warning: 'follwing documents refer to this record and will be destroyed upon force delete call',
            },
            accessRights: {
                test: () => new Promise(async (resolve) => {
                    const authenticated = _.get(req, 'session.authenticated')
                    const { profileType, institutionId } = authenticated

                    const instIdMatch = institutionId === message.institutionId
                    const isIdesAdmin = profileType === Constants.idesAdmin
                    const isSchoolAdmin = (profileType === Constants.schoolAdmin && instIdMatch)

                    // if (isIdesAdmin) return resolve(true)

                    // if (action === 'create') {
                    //     if (isSchoolAdmin) return resolve(true)
                    // }

                    // if (action === 'list') {
                    //     if (instIdMatch) return resolve(true)
                    // }

                    // if (action === 'update') {
                    //     if (isSchoolAdmin) return resolve(true)
                    // }

                    // if (action === 'delete') {
                    //     if (isSchoolAdmin) return resolve(true)
                    // }

                    resolve(true)
                }),
                warning: 'you have no access to requested resource',
            },
            type: {
                test: () => new Promise(async (resolve) => {
                    if (
                        message['type'] &&
                        message['type'].length &&
                        ([Constants.email, Constants.socketChat].includes(message.type))
                    ) return resolve(true)
                    resolve(false)
                }),
                warning: 'type is required prop',
            },
            content: {
                test: () => new Promise(async (resolve) => {
                    if (message.type === Constants.email) {
                        const contentMissingProps = ['subject', 'to', 'text'].filter(i => !(_.has(message, `content.${i}`)))
                        if (contentMissingProps.length) return resolve({ success: false, reason: { contentMissingProps } })

                        return resolve(true)
                    }

                    if (message.type === Constants.socketChat) {
                        const contentMissingProps = ['chatId', 'leftBy', 'text'].filter(i => !(_.has(message, `content.${i}`)))
                        if (contentMissingProps.length) return resolve({ success: false, reason: { contentMissingProps } })

                        const checks = await Promise.all([
                            Chats.findOne({ chatId: message.content.chatId }),
                            Accounts.findOne({ accountId: message.content.leftBy })
                        ])

                        if (!checks[0]) return resolve({ success: false, reason: { chatId: 'no such chat' } })
                        if (!checks[1]) return resolve({ success: false, reason: { leftBy: 'no such user' } })

                        return resolve(true)
                    }

                    resolve(false)
                }),
                warning: 'content is required prop and should match its message type',
            },
            institutionId: {
                test: () => new Promise(async (resolve) => {
                    if (message['institutionId'] && (await Institutions.findOne({ institutionId: message.institutionId }))) return resolve(true)
                    resolve(false)
                }),
                warning: 'institutionId is required prop and should match registered organization',
            }
        }
    },

}
