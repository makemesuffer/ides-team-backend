const shortid = require('shortid')
const _ = require('lodash')
const moment = require('moment')
const { Constants } = sails.config.globals

module.exports = {

    attributes: {
        eventName: {
            type: 'string',
            required: true
        },
        eventType: {
            type: 'string',
            required: true,
            enum: [Constants.online, Constants.offline]
        },
        belongsToDiscipline: {
            type: 'string',
            required: true
            // disciplineId
        },
        belongsToGroup: {
            type: 'string',
            required: true
            // groupId
        },
        instructor: {
            type: 'string',
            required: true
            // accountId
        },
        topic: {
            required: true,
            type: 'json'
            // someDisciplineObjTopic
        },
        // utc based timeslot
        startDate: {
            type: 'string',
            required: true,
        },
        endDate: {
            type: 'string',
            required: true,
        },
        //
        relatedAssignments: {
            type: 'json',
            defaultsTo: [
                // assignmentId,
            ],
        },
        relatedMaterials: {
            type: 'json',
            defaultsTo: [],
        },
        content: {
            type: 'json',
            defaultsTo: {},
        },
        additionalInfo: {
            type: 'json',
            defaultsTo: {},
            //
            // ?canceled
            //
        },
        // meta
        institutionId: {
            type: 'string',
            required: true
        },
        eventId: {
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

    beforeCreate: async (event, next) => {
        try {
            event.eventId = shortid.generate()

            event.utc = Utils.date.utc()
            event.ymd = Utils.date.ymd()

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
            let records = await NativeQuery.find(Events, params.where, { ...params })

            if (query.populate) records = await Promise.all(records.map(r => Events.populate(r)))
            return { success: true, reason: records }
        } catch (e) {
            return { success: false, reason: e }
        }
    },

    fillIn: async (filter, props) => {
        try {
            if (props.populated) throw new Error('doNotFillInPopulated')

            const records = await NativeQuery.find(Events, filter)
            if (!records.length) return { success: false, reason: 'noRecordsFound' }
            const updateReqs = []

            records.forEach(r => updateReqs.push(new Promise(async (resolve, reject) => {
                Object.keys(props).forEach(path => _.set(r, path, props[path]))

                const updated = await Events.update({ eventId: r.eventId }, { ...r }).catch(e => reject(e)) || []
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

            // belongsToDiscipline ref
            reqs.push(new Promise(async (resolve) => {
                const discipline = await Disciplines.findOne({ disciplineId: record.belongsToDiscipline }) || null
                populated.discipline = discipline
                resolve({ discipline })
            }))

            // belongsToGroup ref
            reqs.push(new Promise(async (resolve) => {
                const group = await Groups.findOne({ groupId: record.belongsToGroup }) || null
                populated.group = group
                resolve({ group })
            }))

            // instructor
            reqs.push(new Promise(async (resolve) => {
                const instructor = await Accounts.findOne({ accountId: record.instructor }) || null
                populated.taughtBy = instructor
                resolve({ instructor })
            }))

            await Promise.all(reqs)
            return { ...populated }
        } catch (e) {
            return { success: false, reason: e }
        }
    },

    getRelated: async (record) => {
        const criteria = { eventId: record.eventId }

        const related = {
        }

        return related
    },

    // validation

    validateCreate: async (req, event) => {
        try {
            const checkRules = _.omit(Events.commonRules(req, event, 'create'), ['boundToDestroy'])
            const failedChecks = {}
            const checks = []

            for (const prop in {
                ...checkRules,
                ...event,
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
            const records = await NativeQuery.find(Events, filter)
            if (!records.length) return { success: false, reason: 'noRecordsFound' }

            const allValidations = []
            records.forEach((r) => allValidations.push(new Promise(async (resolve) => {
                const rules = Events.commonRules(req, { ...r, ...props }, 'update')
                let checkRules = _.omit(rules, ['boundToDestroy','sameTopicEvent','eventCollision'])

                if (props.startDate || props.endDate) checkRules = { ...checkRules, eventCollision: rules.eventCollision }
                if (props.topic) checkRules = { ...checkRules, sameTopicEvent: rules.sameTopicEvent }

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
                if (Object.keys(failedChecks).length) return resolve({ failedChecks, eventId: r.eventId })
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

    validateDestroy: async (req, eventId) => {
        try {
            const event = await Events.findOne({ eventId })
            if (!event) return { success: false, reason: 'noRecordsFound' }

            const checkRules = _.pick({ ...Events.commonRules(req, event, 'delete') }, ['accessRights', 'boundToDestroy'])
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
            const records = await NativeQuery.find(Events, query.filter)

            const allValidations = []
            records.forEach((r) => allValidations.push(new Promise(async (resolve) => {
                const checkRules = _.pick({ ...Events.commonRules(req, r, 'list') }, ['accessRights'])
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
                if (Object.keys(failedChecks).length) return resolve({ failedChecks, eventId: r.eventId })
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

    commonRules: (req, event, action) => {
        return {
            boundToDestroy: {
                test: () => new Promise(async (resolve) => {
                    if (req.params.force) return resolve(true)

                    const related = await Events.getRelated(event)
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

                    const instIdMatch = institutionId === event.institutionId
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
            sameTopicEvent: {
                test: () => new Promise(async (resolve) => {
                    const { reason: withSameTopic } = await Events.fetch({
                        filter: {
                            belongsToDiscipline: event.belongsToDiscipline,
                            belongsToGroup: event.belongsToGroup,
                            'topic.type': event.topic.type,
                            'topic.name': event.topic.name
                        }
                    })

                    if (action === 'create' && withSameTopic.length > 0) {
                        return resolve(false)
                    }
                    if (action === 'update' && withSameTopic.length > 0) {
                        const exists = withSameTopic.some(tryEvent => {
                            return tryEvent.eventId !== event.eventId
                        });

                        if (exists) {
                            return resolve(false)
                        }
                    }

                    resolve(true)
                }),
                warning: 'event with this topic already exists'
            },
            eventCollision: {
                test: () => new Promise(async (resolve) => {
                    const events = await Events.find({ belongsToGroup: event.belongsToGroup })

                    if (events.length) {
                        const reservedSlots = events.map(({ startDate, endDate, eventId }) => (
                            { startDate: startDate, endDate: endDate, eventId }
                        ))
                        const overlapsWith = reservedSlots.filter((reserved) => {
                            const newEventStartDate = moment(Number(event.startDate))
                            const newEventEndDate = moment(Number(event.endDate))

                            if (
                                (action === 'update' &&
                                event.eventId !== reserved.eventId || action === 'create') && (
                                newEventStartDate.isBetween(Number(reserved.startDate), Number(reserved.endDate), 'minutes', '[]') ||
                                newEventEndDate.isBetween(Number(reserved.startDate), Number(reserved.endDate), 'minutes', '[]')
                                )
                            ) return reserved
                        })

                        if (overlapsWith.length) return resolve(false)
                    }
                    resolve(true)
                }),
                warning: 'passed event overlaps with another existing event time slot'
            },
            eventName: {
                test: () => new Promise(async (resolve) => {
                    if (event['eventName'] && event['eventName'].length) return resolve(true)
                    resolve(false)
                }),
                warning: 'eventName is required prop',
            },
            eventType: {
                test: () => new Promise(async (resolve) => {
                    if (
                        event['eventType'] &&
                        event['eventType'].length &&
                        ([Constants.online, Constants.offline].includes(event.eventType))
                    ) return resolve(true)
                    resolve(false)
                }),
                warning: 'eventType is required prop and should be submitted as: online || offline',
            },
            belongsToDiscipline: {
                test: () => new Promise(async (resolve) => {
                    if (event['belongsToDiscipline'] && (await Disciplines.findOne({ disciplineId: event.belongsToDiscipline }))) return resolve(true)
                    resolve(false)
                }),
                warning: 'belongsToDiscipline is required prop and should refer to existing discipline',
            },
            belongsToGroup: {
                test: () => new Promise(async (resolve) => {
                    if (event['belongsToGroup'] && (await Groups.findOne({ groupId: event.belongsToGroup }))) return resolve(true)
                    resolve(false)
                }),
                warning: 'belongsToGroup is required prop and should refer to existing group',
            },
            instructor: {
                test: () => new Promise(async (resolve) => {
                    if (event['instructor'] && (await Accounts.findOne({ accountId: event.instructor }))) return resolve(true)
                    resolve(false)
                }),
                warning: 'instructor is required prop and should refer to existing account'
            },
            topic: {
                test: () => new Promise(async (resolve) => {
                    if (
                        event['topic'] &&
                        (event['topic'].name && event['topic'].name.length) &&
                        (event['topic'].type && [
                            Constants.lecture, Constants.seminar
                        ].includes(event['topic'].type))
                    ) return resolve(true)
                    resolve(false)
                }),
                warning: `topic is required prop and should be submitted as following shape {'name': 'topicName', 'type': lecture || seminar}`,
            },
            startDate: {
                test: () => new Promise(async (resolve) => {
                    if (event['startDate'] && event['startDate'].length) return resolve(true)
                    resolve(false)
                }),
                warning: 'startDate is required prop',
            },
            endDate: {
                test: () => new Promise(async (resolve) => {
                    if (event['endDate'] && event['endDate'].length) return resolve(true)
                    resolve(false)
                }),
                warning: 'endDate is required prop',
            },
            institutionId: {
                test: () => new Promise(async (resolve) => {
                    if (event['institutionId'] && (await Institutions.findOne({ institutionId: event.institutionId }))) return resolve(true)
                    resolve(false)
                }),
                warning: 'institutionId is required prop and should match registered organization',
            }
        }
    },

}
