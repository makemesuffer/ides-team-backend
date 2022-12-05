const shortid = require('shortid')
const _ = require('lodash')
const { Constants } = sails.config.globals

module.exports = {

    attributes: {
        disciplineName: {
            type: 'string',
            required: true
        },
        description: {
            type: 'string',
            defaultsTo: ''
        },
        topics: {
            type: 'json',
            defaultsTo: [],
            // [{
            //	name: 'Randomness: Computational and Philosophical Approaches',
            //	type: Constants.lecture || Constants.seminar
            // },]
        },
        additionalInfo: {
            type: 'json',
            defaultsTo: {},
        },
        // meta
        institutionId: {
            type: 'string',
            required: true
        },
        disciplineId: {
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

    beforeCreate: async (discipline, next) => {
        try {
            discipline.disciplineId = shortid.generate()
            discipline.utc = Utils.date.utc()
            discipline.ymd = Utils.date.ymd()

            discipline.topics = _.get(discipline, 'topics', []).map(t => ({ ...t, topicId: shortid.generate() }))

            next()
        } catch (e) {
            next(e)
        }
    },

    afterDestroy: async (destroyedRecords, next) => {
        try {
            const updates = []

            destroyedRecords.forEach((d) => updates.push(new Promise(async (resolve, reject) => {
                const { reason: affectedInstructors } = await Accounts.fetch({ filter: {'additionalInfo.instructs': { $in: [d.disciplineId] }}})
                if (!affectedInstructors.length) return resolve()

                await Promise.all(affectedInstructors.map((instructor) => new Promise(async (resolve, reject) => {
                    const { success: accountUpdated, reason } = await Accounts.fillIn(
                        { accountId: instructor.accountId },
                        { 'additionalInfo.instructs': instructor.additionalInfo.instructs.filter(dId => dId !== d.disciplineId)}
                    )
                    if (!accountUpdated) return reject(reason)
                    resolve()
                }))).catch(e => reject(e))

                resolve()
            })))

            await Promise.all(updates)
            next()
        } catch (e) {
            next(e)
        }
    },

    beforeUpdate: async (valuesToUpdate, next) => {
        try {
            const original = await Disciplines.findOne({ disciplineId: valuesToUpdate.disciplineId })
            const topicsToBeUpdated = _.xorWith(valuesToUpdate.topics, original.topics, _.isEqual)

            if (topicsToBeUpdated.length) {
                const reqs = []

                const newTopicsRefs = valuesToUpdate.topics.map(({ topicId }) => topicId)
                const currentTopicsRefs = original.topics.map(({ topicId }) => topicId)

                const updatedTopics = currentTopicsRefs.filter(r => newTopicsRefs.includes(r))
                const removedTopics = currentTopicsRefs.filter(r => !newTopicsRefs.includes(r))

                updatedTopics.forEach((tId) => reqs.push(new Promise(async (resolve, reject) => {
                    const { reason: affectedEvents, success } = await Events.fetch({ filter: { 'topic.topicId': tId } })
                    if (!success) return reject(reason)

                    await Promise.all(affectedEvents.map(event => Events.update({ eventId: event.eventId }, {
                        topic: valuesToUpdate.topics.filter(({ topicId }) => topicId === tId)[0]
                    }).catch(e => reject(e)) || []))

                    resolve()
                })))

                removedTopics.forEach((tId) => reqs.push(new Promise(async (resolve, reject) => {
                    const { reason: affectedEvents, success } = await Events.fetch({ filter: { 'topic.topicId': tId } })
                    if (!success) return reject(reason)

                    await Promise.all(affectedEvents.map(event => Events.destroy({
                        eventId: event.eventId
                    }).catch(e => reject(e)) || []))

                    resolve()
                })))

                await Promise.all(reqs)
            }

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
            let records = await NativeQuery.find(Disciplines, params.where, { ...params })

            if (query.populate) records = await Promise.all(records.map(r => Disciplines.populate(r)))
            return { success: true, reason: records }
        } catch (e) {
            return { success: false, reason: e }
        }
    },

    fillIn: async (filter, props) => {
        try {
            if (props.populated) throw new Error('doNotFillInPopulated')

            const records = await NativeQuery.find(Disciplines, filter)
            if (!records.length) return { success: false, reason: 'noRecordsFound' }
            const updateReqs = []

            records.forEach(r => updateReqs.push(new Promise(async (resolve, reject) => {
                Object.keys(props).forEach(path => _.set(r, path, props[path]))

                const updated = await Disciplines.update({ disciplineId: r.disciplineId }, { ...r }).catch(e => reject(e)) || []
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
            let reqs = []

            // institutionId ref
            reqs.push(new Promise(async (resolve) => {
                const institution = await Institutions.findOne({ institutionId: record.institutionId }) || null
                populated.institution = institution
                resolve({ institution })
            }))

            await Promise.all(reqs)
            return { ...populated }
        } catch (e) {
            return { success: false, reason: e }
        }
    },

    getRelated: async (record) => {
        const criteria = { disciplineId: record.disciplineId }

        const related = {
        }

        return related
    },

    // validation

    validateCreate: async (req, discipline) => {
        try {
            const checkRules = _.omit(Disciplines.commonRules(req, discipline, 'create'), ['boundToDestroy', 'affectedEvents'])
            const failedChecks = {}
            const checks = []

            for (const prop in {
                ...checkRules,
                ...discipline,
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
            const records = await NativeQuery.find(Disciplines, filter)
            if (!records.length) return { success: false, reason: 'noRecordsFound' }

            const allValidations = []
            records.forEach((r) => allValidations.push(new Promise(async (resolve) => {
                const checkRules = _.omit(Disciplines.commonRules(req, { ...r, ...props }, 'update'), ['boundToDestroy'])
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
                if (Object.keys(failedChecks).length) return resolve({ failedChecks, disciplineId: r.disciplineId })
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

    validateDestroy: async (req, disciplineId) => {
        try {
            const discipline = await Disciplines.findOne({ disciplineId })
            if (!discipline) return { success: false, reason: 'noRecordsFound' }

            const checkRules = _.pick({ ...Disciplines.commonRules(req, discipline, 'delete') }, ['accessRights', 'boundToDestroy'])
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
            const records = await NativeQuery.find(Disciplines, query.filter)

            const allValidations = []
            records.forEach((r) => allValidations.push(new Promise(async (resolve) => {
                const checkRules = _.pick({ ...Disciplines.commonRules(req, r, 'list') }, ['accessRights'])
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
                if (Object.keys(failedChecks).length) return resolve({ failedChecks, disciplineId: r.disciplineId })
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

    commonRules: (req, discipline, action) => {
        return {
            affectedEvents: {
                test: () => new Promise(async (resolve) => {
                    const original = await Disciplines.findOne({ disciplineId: discipline.disciplineId })
                    const topicsToBeUpdated = _.xorWith(discipline.topics, original.topics, _.isEqual)

                    const newTopicsRefs = discipline.topics.map(({ topicId }) => topicId)
                    const currentTopicsRefs = original.topics.map(({ topicId }) => topicId)

                    const updatedTopics = currentTopicsRefs.filter(r => newTopicsRefs.includes(r))
                    const removedTopics = currentTopicsRefs.filter(r => !newTopicsRefs.includes(r))

                    if (req.params.force) {
                        const reqs = []
                        const unenforceable = {}

                        updatedTopics.forEach((tId) => reqs.push(new Promise(async (resolve, reject) => {
                            const { reason: affectedEvents, success } = await Events.fetch({ filter: { 'topic.topicId': tId } })
                            if (!success) return reject(reason)

                            await Promise.all(affectedEvents.map(async (event) => {
                                const { success: valid, reason: checks } = await Events.validateUpdate(req, { eventId: event.eventId }, {
                                    topic: discipline.topics.filter(({ topicId }) => topicId === tId)[0]
                                })

                                if (!valid) _.set(unenforceable, `invalidEventUpdates.${event.eventId}`, checks)
                            }))

                            resolve()
                        })))

                        removedTopics.forEach((tId) => reqs.push(new Promise(async (resolve, reject) => {
                            const { reason: affectedEvents, success } = await Events.fetch({ filter: { 'topic.topicId': tId } })
                            if (!success) return reject(reason)

                            await Promise.all(affectedEvents.map(async (event) => {
                                const { success: valid, reason: checks } = await Events.validateDestroy(req, event.eventId)

                                if (!valid) _.set(unenforceable, `invalidEventDestructions.${event.eventId}`, checks)
                            }))

                            resolve()
                        })))

                        await Promise.all(reqs)
                        if (
                            Object.keys(_.get(unenforceable, 'invalidEventUpdates', [])).length ||
                            Object.keys(_.get(unenforceable, 'invalidEventDestructions', [])).length
                        ) return resolve({ success: false, reason: { unenforceable } })

                        return resolve(true)
                    }

                    if (topicsToBeUpdated.length) {
                        const reqs = []
                        const affected = {}

                        updatedTopics.forEach((tId) => reqs.push(new Promise(async (resolve, reject) => {
                            const { reason: affectedEvents, success } = await Events.fetch({ filter: { 'topic.topicId': tId } })
                            if (!success) return reject(reason)
                            if (affectedEvents.length) affected.willBeUpdated = [...affectedEvents, ..._.get(affected, 'willBeUpdated', [])]
                            resolve()
                        })))

                        removedTopics.forEach((tId) => reqs.push(new Promise(async (resolve, reject) => {
                            const { reason: affectedEvents, success } = await Events.fetch({ filter: { 'topic.topicId': tId } })
                            if (!success) return reject(reason)
                            if (affectedEvents.length) affected.willBeDestroyed = [...affectedEvents, ..._.get(affected, 'willBeDestroyed', [])]
                            resolve()
                        })))

                        await Promise.all(reqs)
                        if (Object.keys(affected).length) return resolve({ success: false, reason: { ...affected } })
                    }

                    resolve({ success: true })
                }),
                warning: 'following records will be modified upon this call'
            },
            boundToDestroy: {
                test: () => new Promise(async (resolve) => {
                    if (req.params.force) return resolve(true)

                    const related = await Disciplines.getRelated(discipline)
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

                    const instIdMatch = institutionId === discipline.institutionId
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
            disciplineName: {
                test: () => new Promise(async (resolve) => {
                    if (discipline['disciplineName'] && discipline['disciplineName'].length) return resolve(true)
                    resolve(false)
                }),
                warning: 'disciplineName is required prop',
            },
            topics: {
                test: () => new Promise(async (resolve) => {
                    if (!Array.isArray(discipline.topics)) return resolve(false)
                    if (discipline.topics.length) {
                        const improperlyDefined = discipline.topics.filter(t => (
                            (!t.name || !t.name.length) ||
                            (!t.type || ![Constants.seminar, Constants.lecture].includes(t.type))
                        ))

                        if (improperlyDefined.length) return resolve(false)
                    }
                    resolve(true)
                }),
                warning: `topics should be submitted as following shape [{ name: String, type: Constants.lecture || Constants.seminar },]`,
            },
            institutionId: {
                test: () => new Promise(async (resolve) => {
                    if (discipline['institutionId'] && (await Institutions.findOne({ institutionId: discipline.institutionId }))) return resolve(true)
                    resolve(false)
                }),
                warning: 'institutionId is required prop and should match registered organization',
            }
        }
    },
}
