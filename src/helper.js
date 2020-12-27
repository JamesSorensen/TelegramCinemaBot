module.exports = {
	logStart() {
		console.log('Bot has been started ...')
	},
	getChatId(msg) {
		return msg.chat.id
	},
	// auxiliary method for showing a movie by id
	getItemUuid(source) {
		return source.substr(2, source.length)
	}
}

