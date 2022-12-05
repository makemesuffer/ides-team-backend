const {
    NODE_ENV,
    CLEAN_DEMO,
    FRESH_DB, SUDO_FRESH_DB,
} = process.env

const demoRecords = require('../../config/demoRecords.js')
const { Constants } = sails.config.globals

module.exports = {
    getInstanceId: async () => {
        try {
            if (NODE_ENV !== 'development') {
                // set aws instance id
                const axios = require('axios')
                const getInstanceReq = await axios.get('http://169.254.169.254/latest/meta-data/instance-id')
                if (getInstanceReq.status === 200) return sails.awsInstanceId = getInstanceReq.data

                throw new Error('getInstanceId err')
            }

            sails.awsInstanceId = 'dev'
        } catch (e) {
            sails.log.error(e)
        }
    },
    prepareDb: async () => {
        const {
            freshDb,
            clean,

            ensureAccountExists,
            ensureInstitutionExists,

            generateSampleUsers,
            generateSampleEvents,

            generateSampleFaculties,
            generateSampleDepartments,
            generateSampleCourses,

            generateSampleGroups,
            generateSampleDisciplines,
            generateSamplePlans,

            generateSampleAssignments,
            generateSampleCatalogues,

            distanceLlc
        } = demoRecords

        const schoolRu = demoRecords.ru.school
        const uniRu = demoRecords.ru.university

        if ((NODE_ENV !== 'production' && FRESH_DB) || SUDO_FRESH_DB) await freshDb()
        if (!CLEAN_DEMO) return

        sails.log.info('BOOTSTRAP: clean demo start')


        // ensure distance base accounts exist
        // // org
        await ensureInstitutionExists(distanceLlc.orgRecord)
        // // accounts
        await ensureAccountExists(distanceLlc.defaultAdminAcc)


        //  prepare university demo
        await clean(uniRu.orgRecord.name)
        // // org
        await ensureInstitutionExists(uniRu.orgRecord)
        // // default accounts
        await ensureAccountExists(uniRu.defaultAdminAcc)

        // // faculties, departments
        await generateSampleFaculties(uniRu.orgRecord.name, 5)
        await generateSampleDepartments(uniRu.orgRecord.name, 4)

        // // accounts staff
        await generateSampleUsers(uniRu.orgRecord.name, 30, Constants.staff)

        // // courses
        await generateSampleCourses(uniRu.orgRecord.name, 1)

        // // groups
        await generateSampleGroups(uniRu.orgRecord.name, 1)

        // // accounts students
        await generateSampleUsers(uniRu.orgRecord.name, 30, Constants.student)

        // // accounts parents
        await generateSampleUsers(uniRu.orgRecord.name, 30, Constants.parent)

        // // disciplines
        await generateSampleDisciplines(uniRu.orgRecord.name, 30)

        // // plans
        await generateSamplePlans(uniRu.orgRecord.name, 1)

        // // events
        await generateSampleEvents(uniRu.orgRecord.name, 8)

        // // assignments
        await generateSampleAssignments(uniRu.orgRecord.name, 3)

        // // catalogues
        await generateSampleCatalogues(uniRu.orgRecord.name)

        sails.log.info('BOOTSTRAP: clean demo finish')
    }
}
