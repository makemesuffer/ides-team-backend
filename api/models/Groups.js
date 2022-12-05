const shortid = require('shortid')
const _ = require('lodash')
const { Constants } = sails.config.globals

module.exports = {

    attributes: {
        groupName: {
            type: 'string',
            required: true
        },
        belongsToFaculty: {
            type: 'string',
            required: true
        },
        belongsToDepartment: {
            type: 'string',
            required: true
        },
        belongsToCourse: {
            type: 'string',
            required: true
        },
        status: {
            type: 'string',
            required: true,
            enum: [Constants.vacant, Constants.formed]
        },
        additionalInfo: {
            type: 'json',
            defaultsTo: {},
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
        // meta
        institutionId: {
            type: 'string',
            required: true
        },
        groupId: {
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

    beforeCreate: async (group, next) => {
        try {
            group.groupId = shortid.generate()

            group.utc = Utils.date.utc()
            group.ymd = Utils.date.ymd()

            next()
        } catch (e) {
            next(e)
        }
    },

    afterDestroy: async (destroyedRecords, next) => {
        try {
            const destructions = []

            destroyedRecords.forEach((g) => destructions.push(new Promise(async (resolve) => {
                const criteria = { belongsToGroup: g.groupId }

                await Promise.all([
                    Assignments.destroy(criteria),
                    Events.destroy(criteria)
                ])

                resolve()
            })))

            await Promise.all(destructions)
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
            let records = await NativeQuery.find(Groups, params.where, { ...params })

            if (query.populate) records = await Promise.all(records.map(r => Groups.populate(r)))
            return { success: true, reason: records }
        } catch (e) {
            return { success: false, reason: e }
        }
    },

    fillIn: async (filter, props) => {
        try {
            if (props.populated) throw new Error('doNotFillInPopulated')

            const records = await NativeQuery.find(Groups, filter)
            if (!records.length) return { success: false, reason: 'noRecordsFound' }
            const updateReqs = []

            records.forEach(r => updateReqs.push(new Promise(async (resolve, reject) => {
                Object.keys(props).forEach(path => _.set(r, path, props[path]))

                const updated = await Groups.update({ groupId: r.groupId }, { ...r }).catch(e => reject(e)) || []
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

            // belongsToFaculty ref
            reqs.push(new Promise(async (resolve) => {
                const faculty = await Faculties.findOne({ facultyId: record.belongsToFaculty }) || null
                populated.faculty = faculty
                resolve({ faculty })
            }))

            // belongsToDepartment ref
            reqs.push(new Promise(async (resolve) => {
                const department = await Departments.findOne({ departmentId: record.belongsToDepartment }) || null
                populated.department = department
                resolve({ department })
            }))

            // belongsToCourse ref
            reqs.push(new Promise(async (resolve) => {
                const course = await Courses.findOne({ courseId: record.belongsToCourse }) || null
                populated.course = course
                resolve({ course })
            }))

            await Promise.all(reqs)
            return { ...populated }
        } catch (e) {
            return { success: false, reason: e }
        }
    },

    getRelated: async (record) => {
        const criteria = { belongsToGroup: record.groupId }

        const related = {
            assignments: await Assignments.find(criteria),
            events: await Events.find(criteria)
        }

        return related
    },

    // validation

    validateCreate: async (req, group) => {
        try {
            const checkRules = _.omit(Groups.commonRules(req, group, 'create'), ['boundToDestroy'])
            const failedChecks = {}
            const checks = []

            for (const prop in {
                ...checkRules,
                ...group,
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
            const records = await NativeQuery.find(Groups, filter)
            if (!records.length) return { success: false, reason: 'noRecordsFound' }

            const allValidations = []
            records.forEach((r) => allValidations.push(new Promise(async (resolve) => {
                const checkRules = _.omit(Groups.commonRules(req, { ...r, ...props }, 'update'), ['boundToDestroy'])
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
                if (Object.keys(failedChecks).length) return resolve({ failedChecks, groupId: r.groupId })
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

    validateDestroy: async (req, groupId) => {
        try {
            const group = await Groups.findOne({ groupId })
            if (!group) return { success: false, reason: 'noRecordsFound' }

            const checkRules = _.pick({ ...Groups.commonRules(req, group, 'delete') }, ['accessRights', 'boundToDestroy'])
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
            const records = await NativeQuery.find(Groups, query.filter)

            const allValidations = []
            records.forEach((r) => allValidations.push(new Promise(async (resolve) => {
                const checkRules = _.pick({ ...Groups.commonRules(req, r, 'list') }, ['accessRights'])
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
                if (Object.keys(failedChecks).length) return resolve({ failedChecks, groupId: r.groupId })
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

    commonRules: (req, group, action) => {
        return {
            boundToDestroy: {
                test: () => new Promise(async (resolve) => {
                    if (req.params.force) return resolve(true)

                    const related = await Groups.getRelated(group)
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

                    const instIdMatch = institutionId === group.institutionId
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
            groupName: {
                test: () => new Promise(async (resolve) => {
                    if (group['groupName'] && group['groupName'].length) return resolve(true)
                    resolve(false)
                }),
                warning: 'groupName is required prop',
            },
            belongsToFaculty: {
                test: () => new Promise(async (resolve) => {
                    if (group['belongsToFaculty'] && (await Faculties.findOne({ facultyId: group.belongsToFaculty }))) return resolve(true)
                    resolve(false)
                }),
                warning: 'belongsToFaculty is required prop and should refer to exisiting faculty',
            },
            belongsToDepartment: {
                test: () => new Promise(async (resolve) => {
                    if (group['belongsToDepartment'] && (await Departments.findOne({ departmentId: group.belongsToDepartment }))) return resolve(true)
                    resolve(false)
                }),
                warning: 'belongsToDepartment is required prop and should refer to exisiting department',
            },
            belongsToCourse: {
                test: () => new Promise(async (resolve) => {
                    if (group['belongsToCourse'] && (await Courses.findOne({ courseId: group.belongsToCourse }))) return resolve(true)
                    resolve(false)
                }),
                warning: 'belongsToCourse is required prop and should refer to exisiting course',
            },
            status: {
                test: () => new Promise(async (resolve) => {
                    if (
                        group['status'] &&
                        group['status'].length &&
                        ([Constants.vacant, Constants.formed].includes(group.status))
                    ) return resolve(true)
                    resolve(false)
                }),
                warning: 'status is required prop and should be submitted as: vacant || formed',
            },
            startDate: {
                test: () => new Promise(async (resolve) => {
                    if (group['startDate'] && group['startDate'].length) return resolve(true)
                    resolve(false)
                }),
                warning: 'startDate is required prop',
            },
            endDate: {
                test: () => new Promise(async (resolve) => {
                    if (group['endDate'] && group['endDate'].length) return resolve(true)
                    resolve(false)
                }),
                warning: 'endDate is required prop',
            },
            institutionId: {
                test: () => new Promise(async (resolve) => {
                    if (group['institutionId'] && (await Institutions.findOne({ institutionId: group.institutionId }))) return resolve(true)
                    resolve(false)
                }),
                warning: 'institutionId is required prop and should match registered organization',
            }
        }
    },

}
