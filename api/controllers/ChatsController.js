const { Constants } = sails.config.globals

module.exports = {
    getActiveChats: async (req, res) => {
        try {
            const { accountId } = req.session.authenticated
            const { success, reason } = await Chats.fetch({
                filter: {
                    participants: { $in: [accountId] }
                }
            })
            if (!success) return res.badRequest(reason)

            return res.ok(true, reason)
        } catch (e) {
            return res.error(e)
        }
    },

    inviteToJoin: async (req, res) => {
        try {
            const locale = Locale('markers')
            const { inviteToJoin } = req.body

            const props = ['host', 'invitees']
            const missingProps = props.filter(item => !(item in inviteToJoin))

            if (inviteToJoin && !missingProps.length) {
                const { success, reason } = await Chats.inviteToJoin(
                    inviteToJoin.chatId || 'createNewChat',
                    inviteToJoin.host,
                    inviteToJoin.invitees
                )
                if (!success) return res.badRequest(reason)

                return res.ok(true, reason)
            }

            return res.badRequest({ missingProps, marker: locale.requestMissingRequiredProps })
        } catch (e) {
            return res.error(e)
        }
    },

    joinChat: async (req, res) => {
        try {
            const locale = Locale('markers')
            const { chatId } = req.params

            if (chatId) {
                const { accountId } = req.session.authenticated
                const { success, reason } = await Chats.join(accountId, chatId)
                if (!success) return res.badRequest(reason)

                return res.ok(true, reason)
            }

            return res.badRequest({ missingProps: ['chatId'], marker: locale.requestMissingRequiredProps })
        } catch (e) {
            return res.error(e)
        }
    },

    leaveChat: async (req, res) => {
        try {
            const locale = Locale('markers')
            const { chatId } = req.params

            if (chatId) {
                const { accountId } = req.session.authenticated
                const { success, reason } = await Chats.leave(accountId, chatId)
                if (!success) return res.badRequest(reason)

                return res.ok(true, reason)
            }

            return res.badRequest({ missingProps: ['chatId'], marker: locale.requestMissingRequiredProps })
        } catch (e) {
            return res.error(e)
        }
    },

    rejectInvite: async (req, res) => {
        try {
            const locale = Locale('markers')
            const { chatId } = req.params

            if (chatId) {
                const { accountId } = req.session.authenticated
                const { success, reason } = await Chats.rejectInvite(accountId, chatId)
                if (!success) return res.badRequest(reason)

                return res.ok(true, reason)
            }

            return res.badRequest({ missingProps: ['chatId'], marker: locale.requestMissingRequiredProps })
        } catch (e) {
            return res.error(e)
        }
    },

    // 

    postMessage: async (req, res) => {
        try {
            const locale = Locale('markers')
            const { message } = req.body

            const props = ['type', 'content']
            const missingProps = props.filter(item => !(item in message))

            if (message && !missingProps.length) {
                const { institutionId } = req.session.authenticated
                const { success: valid, reason: checks } = await Messages.validateCreate(req, { ...message, institutionId })
                if (!valid) return res.badRequest({ details: checks, marker: locale.requestValidationFailed })

                const record = await Messages.create({ ...message, institutionId })
                return res.created({ messageId: record.messageId })
            }

            return res.badRequest({ missingProps, marker: locale.requestMissingRequiredProps })
        } catch (e) {
            return res.error(e)
        }
    },

    editMessage: async (req, res) => {
        try {
            const locale = Locale('markers')
            const { filter, props } = req.body

            const updateProps = ['filter', 'props']
            const missingProps = updateProps.filter(item => !(item in req.body))

            if (!missingProps.length) {
                const { success: valid, reason: checks } = await Messages.validateUpdate(req, filter, props)
                if (!valid) return res.badRequest({ details: checks, marker: locale.requestValidationFailed })

                const { success, reason } = await Messages.fillIn(filter, props)
                if (!success) return res.badRequest(reason)
                return res.ok(true, reason)
            }

            return res.badRequest({ missingProps, marker: locale.requestMissingRequiredProps })
        } catch (e) {
            return res.error(e)
        }
    },

    deleteMessage: async (req, res) => {
        try {
            const locale = Locale('markers')
            const { messageId } = req.params

            if (messageId) {
                const { success: valid, reason: checks } = await Messages.validateDestroy(req, messageId)
                if (!valid) return res.badRequest({ details: checks, marker: locale.requestValidationFailed })

                const result = await Messages.destroy({ messageId })
                if (!result.length) return res.badRequest({ marker: locale.noRecordsFound })

                return res.ok(true, { marker: locale.resourceHasBeenRemoved })
            }

            return res.badRequest({ missingProps: ['messageId'], marker: locale.requestMissingRequiredProps })
        } catch (e) {
            return res.error(e)
        }
    },

    //

    chatsChannel: async (req, res) => {
        try {
            const locale = Locale('markers')
            const { chatId, action } = req.params

            if (req.isSocket && req.session.authenticated && action) {
                const { institutionId, accountId } = req.session.authenticated
                const socketId = sails.sockets.getId(req)
                const roomName = Sockets.makeRoomName(institutionId, Constants.chats, chatId)

                if (action === Constants.subscribe) {
                    const { success, reason } = await Sockets.join(socketId, roomName, { institutionId, accountId })
                    if (!success) return res.badRequest(reason)

                    return res.ok(true, reason)
                }

                if (action === Constants.unsubscribe) {
                    const { success, reason } = await Sockets.leave(socketId, roomName, { institutionId, accountId })
                    if (!success) return res.badRequest(reason)

                    return res.ok(true, reason)
                }

                return res.badRequest(locale.wrongActionType)
            }

            if (!action) return res.badRequest(locale.requestMissingRequiredProps)
            return res.badRequest(locale.authorisedSocketsOnly)
        } catch (e) {
            return res.error(e)
        }
    }
}