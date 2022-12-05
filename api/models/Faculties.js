const shortid = require('shortid')
const Utils = require('../services/Utils')
const { Constants } = sails.config.globals
const _ = require('lodash')

module.exports = {

    attributes: {
        facultyName: {
            type: 'string',
            required: true
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
        facultyId: {
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

    beforeCreate: async (faculty, next) => {
        try {
            faculty.facultyId = shortid.generate()

            faculty.utc = Utils.date.utc()
            faculty.ymd = Utils.date.ymd()

            next()
        } catch (e) {
            next(e)
        }
    },

    afterDestroy: async (destroyedRecords, next) => {
        try {
            const destructions = []

            destroyedRecords.forEach((f) => destructions.push(new Promise(async (resolve) => {
                const criteria = { belongsToFaculty: f.facultyId }

                await Promise.all([
                    Groups.destroy(criteria),
                    Courses.destroy(criteria),
                    Departments.destroy(criteria),
                    Plans.destroy(criteria)
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
            let records = await NativeQuery.find(Faculties, params.where, { ...params })

            if (query.populate) records = await Promise.all(records.map(r => Faculties.populate(r)))
            return { success: true, reason: records }
        } catch (e) {
            return { success: false, reason: e }
        }
    },

    fillIn: async (filter, props) => {
        try {
            if (props.populated) throw new Error('doNotFillInPopulated')

            const records = await NativeQuery.find(Faculties, filter)
            if (!records.length) return { success: false, reason: 'noRecordsFound' }
            const updateReqs = []

            records.forEach(r => updateReqs.push(new Promise(async (resolve, reject) => {
                Object.keys(props).forEach(path => _.set(r, path, props[path]))

                const updated = await Faculties.update({ facultyId: r.facultyId }, { ...r }).catch(e => reject(e)) || []
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
        const criteria = { belongsToFaculty: record.facultyId }

        const related = {
            groups: await Groups.find(criteria),
            courses: await Courses.find(criteria),
            departments: await Departments.find(criteria),
            plans: await Plans.find(criteria)
        }

        return related
    },

    // validation

    validateCreate: async (req, faculty) => {
        try {
            const checkRules = _.omit(Faculties.commonRules(req, faculty, 'create'), ['boundToDestroy'])
            const failedChecks = {}
            const checks = []

            for (const prop in {
                ...checkRules,
                ...faculty,
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
            const records = await NativeQuery.find(Faculties, filter)
            if (!records.length) return { success: false, reason: 'noRecordsFound' }

            const allValidations = []
            records.forEach((r) => allValidations.push(new Promise(async (resolve) => {
                const checkRules = _.omit(Faculties.commonRules(req, { ...r, ...props }, 'update'), ['boundToDestroy'])
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
                if (Object.keys(failedChecks).length) return resolve({ failedChecks, facultyId: r.facultyId })
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

    validateDestroy: async (req, facultyId) => {
        try {
            const faculty = await Faculties.findOne({ facultyId })
            if (!faculty) return { success: false, reason: 'noRecordsFound' }

            const checkRules = _.pick({ ...Faculties.commonRules(req, faculty, 'delete') }, ['accessRights', 'boundToDestroy'])
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
            const records = await NativeQuery.find(Faculties, query.filter)

            const allValidations = []
            records.forEach((r) => allValidations.push(new Promise(async (resolve) => {
                const checkRules = _.pick({ ...Faculties.commonRules(req, r, 'list') }, ['accessRights'])
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
                if (Object.keys(failedChecks).length) return resolve({ failedChecks, facultyId: r.facultyId })
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

    commonRules: (req, faculty, action) => {
        return {
            boundToDestroy: {
                test: () => new Promise(async (resolve) => {
                    if (req.params.force) return resolve(true)

                    const related = await Faculties.getRelated(faculty)
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

                    const instIdMatch = institutionId === faculty.institutionId
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
            facultyName: {
                test: () => new Promise(async (resolve) => {
                    if (faculty['facultyName'] && faculty['facultyName'].length) return resolve(true)
                    resolve(false)
                }),
                warning: 'facultyName is required prop',
            },
            institutionId: {
                test: () => new Promise(async (resolve) => {
                    if (faculty['institutionId'] && (await Institutions.findOne({ institutionId: faculty.institutionId }))) return resolve(true)
                    resolve(false)
                }),
                warning: 'institutionId is required prop and should match registered organization',
            }
        }
    },

}
