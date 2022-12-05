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
}