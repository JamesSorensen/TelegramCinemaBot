const mongoose = require('mongoose')
const Schema = mongoose.Schema

const FilmSchema = new Schema({
	name: {
		type: String,
		require: true
	},
	type: {
		type: String,
		require: true
	},
	name: {
		type: String,
		require: true
	},
	uuid: {
		type: String,
		require: true
	},
	year: {
		type: String
	},
	rate: {
		type: Number
	},
	length: {
		type: String
	},
	country: {
		type: String
	},
	link: {
		type: String
	},
	picture: {
		type: String
	},
	cinemas: {
		type: [String],
		default: []
	}
})

// Create a films model
mongoose.model('films', FilmSchema)