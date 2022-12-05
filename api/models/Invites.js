const shortid = require('shortid')
const _ = require('lodash')
const { Constants } = sails.config.globals

module.exports = {

    attributes: {
        firstName: {
            type: 'string',
            required: true
        },
        lastName: {
            type: 'string',
            required: true
        },
        orgName: {
            type: 'string',
            required: true
        },
        email: {
            type: 'string',
            required: true
        },
        status: {
            type: 'string',
            enum: [
                Constants.pending, Constants.approved, Constants.rejected
            ],
            defaultsTo: Constants.pending
        },
        password: {
            type: 'string',
            required: true
        },
        additionalInfo: {
            type: 'json',
            defaultsTo: {}
        },
        // meta
        inviteId: {
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

    beforeCreate: async (invite, next) => {
        try {
            invite.inviteId = shortid.generate()

            invite.utc = Utils.date.utc()
            invite.ymd = Utils.date.ymd()

            invite.password = Secret.encrypt(invite.password)

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
            let records = await NativeQuery.find(Invites, params.where, { ...params })

            if (query.populate) records = await Promise.all(records.map(r => Invites.populate(r)))
            return { success: true, reason: records }
        } catch (e) {
            return { success: false, reason: e }
        }
    },

    fillIn: async (filter, props) => {
        try {
            if (props.populated) throw new Error('doNotFillInPopulated')

            const records = await NativeQuery.find(Invites, filter)
            if (!records.length) return { success: false, reason: 'noRecordsFound' }
            const updateReqs = []

            records.forEach(r => updateReqs.push(new Promise(async (resolve, reject) => {
                Object.keys(props).forEach(path => _.set(r, path, props[path]))

                const updated = await Invites.update({ inviteId: r.inviteId }, { ...r }).catch(e => reject(e)) || []
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
        const criteria = { inviteId: record.inviteId }

        const related = {
        }

        return related
    },

    // validation

    validateCreate: async (req, invite) => {
        try {
            const checkRules = _.omit(Invites.commonRules(req, invite, 'create'), ['boundToDestroy'])
            const failedChecks = {}
            const checks = []

            for (const prop in {
                ...checkRules,
                ...invite,
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
            const records = await NativeQuery.find(Invites, filter)
            if (!records.length) return { success: false, reason: 'noRecordsFound' }

            const allValidations = []
            records.forEach((r) => allValidations.push(new Promise(async (resolve) => {
                const checkRules = _.omit(Invites.commonRules(req, { ...r, ...props }, 'update'), ['alreadyExists', 'boundToDestroy'])
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
                if (Object.keys(failedChecks).length) return resolve({ failedChecks, inviteId: r.inviteId })
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

    validateDestroy: async (req, inviteId) => {
        try {
            const invite = await Invites.findOne({ inviteId })
            if (!invite) return { success: false, reason: 'noRecordsFound' }

            const checkRules = _.pick({ ...Invites.commonRules(req, invite, 'delete') }, ['accessRights', 'boundToDestroy'])
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
            const records = await NativeQuery.find(Invites, query.filter)

            const allValidations = []
            records.forEach((r) => allValidations.push(new Promise(async (resolve) => {
                const checkRules = _.pick({ ...Invites.commonRules(req, r, 'list') }, ['accessRights'])
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
                if (Object.keys(failedChecks).length) return resolve({ failedChecks, inviteId: r.inviteId })
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

    commonRules: (req, invite, action) => {
        return {
            boundToDestroy: {
                test: () => new Promise(async (resolve) => {
                    if (req.params.force) return resolve(true)

                    const related = await Invites.getRelated(invite)
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

                    const isIdesAdmin = profileType === Constants.idesAdmin
                    if (isIdesAdmin) return resolve(true)

                    const inst = await Institutions.findOne({ name: invite.orgName }) || null
                    if (!inst) resolve(false)

                    const instIdMatch = institutionId === inst.institutionId
                    const isSchoolAdmin = (profileType === Constants.schoolAdmin && instIdMatch)

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
            alreadyExists: {
                test: () => new Promise(async (resolve) => {
                    const alreadyExists = (
                        await Invites.findOne({ email: invite.email }) ||
                        await Accounts.findOne({ email: invite.email })
                    )
                    if (alreadyExists) return resolve(false)
                    resolve(true)
                }),
                warning: 'invite or acoount record with such email already exists',
            },
            firstName: {
                test: () => new Promise(async (resolve) => {
                    if (invite['firstName'] && invite['firstName'].length) return resolve(true)
                    resolve(false)
                }),
                warning: 'firstName is required prop',
            },
            lastName: {
                test: () => new Promise(async (resolve) => {
                    if (invite['lastName'] && invite['lastName'].length) return resolve(true)
                    resolve(false)
                }),
                warning: 'lastName is required prop',
            },
            orgName: {
                test: () => new Promise(async (resolve) => {
                    if (invite['orgName'] && invite['orgName'].length) return resolve(true)
                    resolve(false)
                }),
                warning: 'orgName is required prop',
            },
            email: {
                test: () => new Promise(async (resolve) => {
                    if (invite['email'] && invite['email'].length) return resolve(true)
                    resolve(false)
                }),
                warning: 'email is required prop',
            },
            status: {
                test: () => new Promise(async (resolve) => {
                    if (
                        invite['status'] &&
                        invite['status'].length &&
                        (![Constants.pending, Constants.approved, Constants.rejected].includes(invite.status))
                    ) return resolve(false)
                    resolve(true)
                }),
                warning: 'status is required prop and should be submitted as: pending || approved || rejected',
            },
            password: {
                test: () => new Promise(async (resolve) => {
                    if (invite['password'] && invite['password'].length) return resolve(true)
                    resolve(false)
                }),
                warning: 'password is required prop',
            }
        }
    }

}
