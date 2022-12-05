const shortid = require('shortid')
const _ = require('lodash')
const { Constants } = sails.config.globals


module.exports = {

    attributes: {
        participants: {
            type: 'json',
            defaultsTo: []
            // [accountId,]
        },
        invitees: {
            type: 'json',
            defaultsTo: []
            // [accountId,]
        },
        messages: {
            type: 'json',
            defaultsTo: []
            // [messageId,]
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
        chatId: {
            type: 'string'
        },
        utc: {
            type: 'string'
        },
        ymd: {
            type: 'string'
        }
    },

    beforeCreate: async (chat, next) => {
        try {
            chat.chatId = shortid.generate()

            chat.utc = Utils.date.utc()
            chat.ymd = Utils.date.ymd()

            next()
        } catch (e) {
            next(e)
        }
    },

    fetch: async (query = {}) => {
        try {
            let params = {}

            if (query.filter) params.where = query.filter
            if (query.limit) params.limit = Number(query.limit)
            if (query.skip) params.skip = Number(query.skip)

            params.sort = `${_.get(query, 'sort.by', 'utc')} ${_.get(query, 'sort.asc', 'DESC')}`
            let records = await NativeQuery.find(Chats, params.where, { ...params })

            if (query.populate) records = await Promise.all(records.map(r => Chats.populate(r)))
            return { success: true, reason: records }
        } catch (e) {
            return { success: false, reason: e }
        }
    },

    fillIn: async (filter, props) => {
        try {
            if (props.populated) throw new Error('doNotFillInPopulated')

            const records = await NativeQuery.find(Chats, filter)
            if (!records.length) return { success: false, reason: 'noRecordsFound' }
            const updateReqs = []

            records.forEach(r => updateReqs.push(new Promise(async (resolve, reject) => {
                Object.keys(props).forEach(path => _.set(r, path, props[path]))

                const updated = await Chats.update({ chatId: r.chatId }, { ...r }).catch(e => reject(e)) || []
                resolve(updated.length === 1 ? updated[0] : updated)
            })))

            const result = await Promise.all(updateReqs)
            return { success: true, reason: result.length == 1 ? result[0] : result }
        } catch (e) {
            return { success: false, reason: e }
        }
    },

    inviteToJoin: async (chatId, host, invitees) => {
        try {
            const invitedBy = await Accounts.findOne({ accountId: host })
            if (!invitedBy) throw new Error('could not find account host')

            const chat = await Chats.findOne({ chatId }) || await Chats.create({ institutionId: invitedBy.institutionId })
            const { reason: chatWithUpdatedInvitees } = await Chats.fillIn({ chatId: chat.chatId }, {
                invitees: _.uniq([...chat.invitees, ...invitees]),
                participants: _.uniq([...chat.participants, invitedBy.accountId])
            })

            Accounts.broadcastSystemUpdate([...chatWithUpdatedInvitees.invitees], {
                eventType: Constants.invitationToJoinChat,
                data: { ...chatWithUpdatedInvitees }
            })

            return { success: true, reason: chatWithUpdatedInvitees }
        } catch (e) {
            return { success: false, reason: e }
        }
    },

    join: async (accountId, chatId) => {
        try {
            const newMember = await Accounts.findOne({ accountId })
            if (!newMember) throw new Error('could not find related account')

            const chat = await Chats.findOne({ chatId }) || await Chats.create({ institutionId: newMember.institutionId })
            const { reason: chatWithUpdatedMembers } = await Chats.fillIn({ chatId: chat.chatId }, {
                invitees: _.uniq([...chat.invitees.filter(i => i !== newMember.accountId)]),
                participants: _.uniq([...chat.participants, newMember.accountId])
            })

            Sockets.broadcast([
                Sockets.makeRoomName(chat.institutionId, Constants.chats, chat.chatId)
            ], Constants.hasJoinedChat, newMember)

            return { success: true, reason: chatWithUpdatedMembers }
        } catch (e) {
            return { success: false, reason: e }
        }
    },

    leave: async (accountId, chatId) => {
        try {
            const leavingMember = await Accounts.findOne({ accountId })
            if (!leavingMember) throw new Error('could not find related account')

            const chat = await Chats.findOne({ chatId })
            if (!chat) throw new Error('chat does not exist')

            const { reason: chatWithUpdatedMembers } = await Chats.fillIn({ chatId }, {
                participants: chat.participants.filter(p => p !== accountId)
            })

            Sockets.broadcast([
                Sockets.makeRoomName(chat.institutionId, Constants.chats, chat.chatId)
            ], Constants.hasLeftChat, leavingMember)

            return { success: true, reason: chatWithUpdatedMembers }
        } catch (e) {
            return { success: false, reason: e }
        }
    },

    rejectInvite: async (rejectedBy, chatId) => {
        try {
            const declined = await Accounts.findOne({ accountId: rejectedBy })
            if (!declined) throw new Error('could not find related account')

            const chat = await Chats.findOne({ chatId })
            if (!chat) throw new Error('chat does not exist')

            const { reason: chatWithUpdatedInvitees } = await Chats.fillIn({ chatId }, {
                invitees: chat.invitees.filter(i => i !== rejectedBy)
            })

            Sockets.broadcast([
                Sockets.makeRoomName(chat.institutionId, Constants.chats, chat.chatId)
            ], Constants.hasRejectedInvite, declined)

            return { success: true, reason: chatWithUpdatedInvitees }
        } catch (e) {
            return { success: false, reason: e }
        }
    },

    afterUpdate: async (updatedRecord, next) => {
        try {
            Sockets.broadcast([Sockets.makeRoomName(updatedRecord.institutionId, Constants.chats, updatedRecord.chatId)],
                Constants.chatUpdated,
                updatedRecord
            )

            next()
        } catch (e) {
            next(e)
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

            // participants ref
            reqs.push(new Promise(async (resolve) => {
                const fetched = await Promise.all(record.participants.map(accountId => Accounts.findOne({ accountId })))
                fetched.forEach(acc => _.set(populated, `participantsFetched.${acc.accountId}`, acc))
                resolve({ participantsFetched: fetched })
            }))

            // invitees ref
            reqs.push(new Promise(async (resolve) => {
                const fetched = await Promise.all(record.invitees.map(accountId => Accounts.findOne({ accountId })))
                fetched.forEach(acc => _.set(populated, `inviteesFetched.${acc.accountId}`, acc))
                resolve({ participantsFetched: fetched })
            }))

            await Promise.all(reqs)
            return { ...populated }
        } catch (e) {
            return { success: false, reason: e }
        }
    },

    getRelated: async (record) => {
        const criteria = { chatId: record.chatId }

        const related = {
        }

        return related
    }
}
