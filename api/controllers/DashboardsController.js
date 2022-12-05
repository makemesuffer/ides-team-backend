module.exports = {

    student: async (req, res) => {
        try {
            const locale = Locale('markers')

            // call to events
            // call to assignments

            const { success, reason: disciplineProgress } = await StatisticsService.disciplineProgress()
            if (!success) return res.badRequest(reason)

            return res.ok(true, { disciplineProgress })
        } catch (e) {
            return res.error(e)
        }
    },

    instructor: async (req, res) => {
        try {
            const locale = Locale('markers')

            // call to events
            // call to assignments

            return res.ok(true, { instructor: {} })
        } catch (e) {
            return res.error(e)
        }
    },

    admin: async (req, res) => {
        try {
            const locale = Locale('markers')
            const { success: hitAttendance, reason: attendance } = await StatisticsService.attendance()
            if (!hitAttendance) return res.badRequest(reason)

            const { success: hitUserRating, reason: userRating } = await StatisticsService.userRating()
            if (!hitUserRating) return res.badRequest(reason)

            const { success: hitGetMeta, reason: meta } = await StatisticsService.getMeta()
            if (!hitGetMeta) return res.badRequest(reason)

            return res.ok(true, {
                attendance,
                userRating,
                meta
            })
        } catch (e) {
            return res.error(e)
        }
    },

    parent: async (req, res) => {
        try {
            const locale = Locale('markers')
            const { success: hitDisciplineProgress, reason: disciplineProgress } = await StatisticsService.disciplineProgress()
            if (!hitDisciplineProgress) return res.badRequest(reason)

            const { success: hitAttendance, reason: attendance } = await StatisticsService.attendance()
            if (!hitAttendance) return res.badRequest(reason)

            const { success: hitGetMeta, reason: meta } = await StatisticsService.getMeta()
            if (!hitGetMeta) return res.badRequest(reason)

            return res.ok(true, {
                disciplineProgress,
                attendance,
                meta
            })
        } catch (e) {
            return res.error(e)
        }
    }

}