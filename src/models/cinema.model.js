const mongoose = require('mongoose')
const Schema = mongoose.Schema

const CinemaSchema = new Schema({
	uuid: {
		type: String,
		require: true
	},
	name: {
		type: String,
		require: true
	},
	url: {
		type: String
	},
	location: {
		type: Schema.Types.Mixed
	},
	films: {
		type: [String],
		default: []
	}
})

mongoose.model('cinemas', CinemaSchema)