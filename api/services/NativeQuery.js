module.exports = {
    find: (model, query) => {
        return new Promise((resolve, reject) => {
            return model.native((err, collection) => {
                if (err) return reject(err)

                return collection.find(query).toArray((err, result) => {
                    if (err) return reject(err)
                    return resolve(result)
                })
            })
        })
    },
    findOne: (model, query) => {
        return new Promise((resolve, reject) => {
            return model.native((err, collection) => {
                if (err) return reject(err)

                return collection.find(query).toArray((err, result) => {
                    if (err) return reject(err)
                    return resolve(result[0])
                })
            })
        })
    }
}
