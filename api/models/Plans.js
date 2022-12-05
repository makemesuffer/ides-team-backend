const shortid = require('shortid')
const _ = require('lodash')
const { Constants } = sails.config.globals

module.exports = {

    attributes: {
        planName: {
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
        disciplines: {
            type: 'json',
            defaultsTo: [],
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
        planId: {
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

    beforeCreate: async (plan, next) => {
        try {
            plan.planId = shortid.generate()

            plan.utc = Utils.date.utc()
            plan.ymd = Utils.date.ymd()

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
            let records = await NativeQuery.find(Plans, params.where, { ...params })

            if (query.populate) records = await Promise.all(records.map(r => Plans.populate(r)))
            return { success: true, reason: records }
        } catch (e) {
            return { success: false, reason: e }
        }
    },

    fillIn: async (filter, props) => {
        try {
            if (props.populated) throw new Error('doNotFillInPopulated')

            const records = await NativeQuery.find(Plans, filter)
            if (!records.length) return { success: false, reason: 'noRecordsFound' }
            const updateReqs = []

            records.forEach(r => updateReqs.push(new Promise(async (resolve, reject) => {
                Object.keys(props).forEach(path => _.set(r, path, props[path]))

                const updated = await Plans.update({ planId: r.planId }, { ...r }).catch(e => reject(e)) || []
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
                const department = await Departments.findOne({ departmentId: record.belongsToDepartment }) || null
                populated.department = department
                resolve({ department })
            }))

            // disciplines ref
            reqs.push(new Promise(async (resolve) => {
                const fetched = await Promise.all(record.disciplines.map(disciplineId => Disciplines.findOne({ disciplineId })))
                fetched.forEach(discipline => _.set(populated, `disciplinesFetched.${discipline.disciplineId}`, discipline))
                resolve({ disciplinesFetched: fetched })
            }))

            await Promise.all(reqs)
            return { ...populated }
        } catch (e) {
            return { success: false, reason: e }
        }
    },

    getRelated: async (record) => {
        const criteria = { planId: record.planId }

        const related = {
        }

        return related
    },

    // validation
    validateCreate: async (req, plan) => {
        try {
            const checkRules = _.omit(Plans.commonRules(req, plan, 'create'), ['boundToDestroy'])
            const failedChecks = {}
            const checks = []

            for (const prop in {
                ...checkRules,
                ...plan,
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
            const records = await NativeQuery.find(Plans, filter)
            if (!records.length) return { success: false, reason: 'noRecordsFound' }

            const allValidations = []
            records.forEach((r) => allValidations.push(new Promise(async (resolve) => {
                const checkRules = _.omit(Plans.commonRules(req, { ...r, ...props }, 'update'), ['boundToDestroy'])
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
                if (Object.keys(failedChecks).length) return resolve({ failedChecks, planId: r.planId })
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

    validateDestroy: async (req, planId) => {
        try {
            const plan = await Plans.findOne({ planId })
            if (!plan) return { success: false, reason: 'noRecordsFound' }

            const checkRules = _.pick({ ...Plans.commonRules(req, plan, 'delete') }, ['accessRights', 'boundToDestroy'])
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
            const records = await NativeQuery.find(Plans, query.filter)

            const allValidations = []
            records.forEach((r) => allValidations.push(new Promise(async (resolve) => {
                const checkRules = _.pick({ ...Plans.commonRules(req, r, 'list') }, ['accessRights'])
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
                if (Object.keys(failedChecks).length) return resolve({ failedChecks, planId: r.planId })
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

    commonRules: (req, plan, action) => {
        return {
            boundToDestroy: {
                test: () => new Promise(async (resolve) => {
                    if (req.params.force) return resolve(true)

                    const related = await Plans.getRelated(plan)
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

                    const instIdMatch = institutionId === plan.institutionId
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
            planName: {
                test: () => new Promise(async (resolve) => {
                    if (plan['planName'] && plan['planName'].length) return resolve(true)
                    resolve(false)
                }),
                warning: 'planName is required prop',
            },
            belongsToFaculty: {
                test: () => new Promise(async (resolve) => {
                    if (plan['belongsToFaculty'] && (await Faculties.findOne({ facultyId: plan.belongsToFaculty }))) return resolve(true)
                    resolve(false)
                }),
                warning: 'belongsToFaculty is required prop and should refer to exisiting faculty',
            },
            belongsToDepartment: {
                test: () => new Promise(async (resolve) => {
                    if (plan['belongsToDepartment'] && (await Departments.findOne({ departmentId: plan.belongsToDepartment }))) return resolve(true)
                    resolve(false)
                }),
                warning: 'belongsToDepartment is required prop and should refer to exisiting department',
            },
            belongsToCourse: {
                test: () => new Promise(async (resolve) => {
                    if (plan['belongsToCourse'] && (await Courses.findOne({ courseId: plan.belongsToCourse }))) return resolve(true)
                    resolve(false)
                }),
                warning: 'belongsToCourse is required prop and should refer to exisiting course',
            },
            disciplines: {
                test: () => new Promise(async (resolve) => {
                    if (!Array.isArray(plan.disciplines)) return resolve(false)
                    if (plan.disciplines.length) {
                        const improperlyDefined = plan.disciplines.filter(d => typeof d !== 'string')
                        if (improperlyDefined.length) return resolve(false)

                        const result = (await Promise.all(plan.disciplines.map(d => Disciplines.findOne({ disciplineId: d })))).filter(d => d)
                        if (result.length !== plan.disciplines.length) return resolve(false)
                    }
                    resolve(true)
                }),
                warning: `disciplines should be submitted as following shape [disciplineId,] and refer to existing disciplines`,
            },
            institutionId: {
                test: () => new Promise(async (resolve) => {
                    if (plan['institutionId'] && (await Institutions.findOne({ institutionId: plan.institutionId }))) return resolve(true)
                    resolve(false)
                }),
                warning: 'institutionId is required prop and should match registered organization',
            }
        }
    },

}
