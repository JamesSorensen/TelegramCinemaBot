const TelegramBot = require('node-telegram-bot-api')
const mongoose = require('mongoose')
const geolib = require('geolib')
const _ = require('lodash')
const config = require('./config')
const helper = require('./helper')
const keyboard = require('./keyboard.js')
const kb = require('./keyboard_button')
const database = require('../database.json')


helper.logStart()

mongoose.Promise = global.Promise
mongoose.connect(config.DB_URL, {
	useNewUrlParser: true
})
	.then(() => console.log('MongoDB connected'))
	.catch((err) => console.log(err))

require('./models/film.model')
require('./models/cinema.model')
require('./models/user.model')

const Film = mongoose.model('films')
const Cinema = mongoose.model('cinemas')
const User = mongoose.model('users')

// Fill the base
// database.films.forEach(f => new Film(f).save())
// database.cinemas.forEach(c => new Cinema(c).save().catch(e => console.log(e)))

const ACTION_TYPE = {
	TOOGGLE_FAV_FILM: 'tff',
	SHOW_CINEMAS: 'sc',
	SHOW_CINEMAS_MAP: 'scm',
	SHOW_FILMS: 'sf'
} 

/* ============================================== */



// Bot start
const bot = new TelegramBot(config.TOKEN, {
	polling: true
})

// Processing messages
bot.on('message', msg => {
	console.log('Working', msg.from.first_name)
	const chatId = helper.getChatId(msg)

	switch (msg.text) {
		case kb.home.favorite:
			showFovouriteFilms(chatId, msg.from.id)
			break
		case kb.home.films: 
			bot.sendMessage(chatId, 'Виберіть жанр:', {
				reply_markup: {keyboard: keyboard.films}
			})
			break
		case kb.film.comedy:
			sedFilmsByQuery(chatId, {type: "comedy"})
			break
		case kb.film.action:
			sedFilmsByQuery(chatId, {type: "action"})
			break
		case kb.film.random:
			sedFilmsByQuery(chatId, {})
			break
		case kb.home.cinemas:
			bot.sendMessage(chatId, `Відправити містцезнаходження`, {
				reply_markup: {
					keyboard: keyboard.cinemas
				}
			})
			break
		case kb.back:
			bot.sendMessage(chatId, 'Що ви хочете подивитись?', {
				reply_markup: {keyboard: keyboard.home}
			})
			break	
	}

	if(msg.location) {
		getCinemasInCoord(chatId, msg.location)
	}	
})

// CallBack Data
bot.on('callback_query', query => {
	const userId = query.from.id
	let data

	try {
		data = JSON.parse(query.data)
	} catch (e) {
		throw new Error('Data is not an object')
	}

	const { type } = data

	if ( type === ACTION_TYPE.SHOW_CINEMAS_MAP ) {
		const {lat, lon} = data
		bot.sendLocation(query.message.chat.id, lat, lon)
	} else if ( type === ACTION_TYPE.SHOW_CINEMAS ) {
		sendCinemasByQuery(userId, {uuid: {'$in': data.cinemasUuids}})
	} else if( type === ACTION_TYPE.TOOGGLE_FAV_FILM ) {
		toggleFavouriteFilm(userId, query.id, data)
	} else if ( type === ACTION_TYPE.SHOW_FILMS ) {
		sedFilmsByQuery(userId, {uuid: {'$in':  data.filmUuids}})
	}
})



// Command start
bot.onText(/\/start/, msg => {
	const text = `Доброго дня, ${msg.from.first_name}\nВиберіть команду для початку роботи`;
	bot.sendMessage(helper.getChatId(msg), text, {
		reply_markup: {
			keyboard: keyboard.home
		}
	})
})

// Command film show
bot.onText(/\/f(.+)/, (msg, [source, match]) => {
	const filmUuid = helper.getItemUuid(source)
	const chatId = helper.getChatId(msg)

	Promise.all([
		Film.findOne({uuid: filmUuid}),
		User.findOne({telegramId: msg.from.id})
	]).then(([film, user]) => {

		let isFav = false
		if (user) {
			isFav = user.films.indexOf(film.uuid) !== -1
		}

		const favText = isFav ? 'Видалити з вибраного' : 'Добавити в вибране'
		const caption = `Назва: ${film.name}\H: ${film.name}\nРік: ${film.year}\nРейтинг: ${film.rate}\nТривалість: ${film.length}\nКраїна: ${film.country}`                         
		
		bot.sendPhoto(chatId, film.picture, {
			caption: caption,
			reply_markup: {
				inline_keyboard: [
					[
						{
							text: favText,
							callback_data: JSON.stringify({
								type: ACTION_TYPE.TOOGGLE_FAV_FILM,
								filmUuid: film.uuid,
								isFav: isFav
							})
						},
						{
							text: 'Показати кінотеатри',
							callback_data: JSON.stringify({
								type: ACTION_TYPE.SHOW_CINEMAS,
								cinemasUuids: film.cinemas
							})
						}
					],
					[
						{
							text: `Сайт: ${film.name}`,
							url: film.link
						}
					]
				]
			}
		})
	})
})

// Command cimema show
bot.onText(/\/c(.+)/, (msg, [source, match]) => {
	const cinemaUuid = helper.getItemUuid(source)
	const chatId = helper.getChatId(msg)
	Cinema.findOne({uuid: cinemaUuid}).then(cinema => {
		bot.sendMessage(chatId, `Кінотеатр ${cinema.name}`, {
			reply_markup: {
				inline_keyboard: [
					[
						{
							text: cinema.name,
							url: cinema.url
						},
						{
							text: 'Показати на карті',
							callback_data: JSON.stringify({
								type: ACTION_TYPE.SHOW_CINEMAS_MAP,
								lat: cinema.location.latitude,
								lon: cinema.location.longitude
							})
						}
					],
					[
						{
							text: 'Показати фільми',
							callback_data: JSON.stringify({
								type: ACTION_TYPE.SHOW_FILMS,
								filmUuids: cinema.films
							})
						}
					]
				]
			}
		})
	})
})



/* ============================================= */

// Auxiliary functions

function sedFilmsByQuery (chatId, query) {
	Film.find(query).then(films => {
		console.log(films)

		const html = films.map((f, i) => {
			return  `<b>${i + 1}</b> ${f.name} - /f${f.uuid}`
		}).join('\n')

		sendHTML(chatId, html, 'films')
	}) 
}

function sendHTML(chatId, html, kbName = null) {
	const options = {
		parse_mode: 'HTML'
	}

	if (kbName) {
		options['reply_markup'] = {
			keyboard: keyboard[kbName]
		}
	}

	bot.sendMessage(chatId, html, options)
}

function getCinemasInCoord (chatId, location) {	
	Cinema.find({}).then(cinemas => {
		// Find out the length to the location
		cinemas.forEach(c => {
			c.distance = geolib.getDistance(location, c.location) / 1000
		})
		cinemas = _.sortBy(cinemas, 'distance')
		const html = cinemas.map((c, i) => {
			return `<b>${i + 1}</b> ${c.name}. <em>Відстань</em> - <strong>${c.distance}</strong> км. /c${c.uuid}`
		}).join('\n')
		sendHTML(chatId, html, 'home')
	})	
}

function toggleFavouriteFilm (userId, queryId, {filmUuid, isFav}) {
	let userPromise
	User.findOne({telegramId: userId})
		.then(user => {
			if (user) {
				if (isFav) {
					user.films = user.films.filter(fUuid =>  fUuid !== filmUuid) 
				} else {
					user.films.push(filmUuid)
				}
				userPromise = user
			} else {
				userPromise = new User({
					telegramId: userId,
					films: [filmUuid]
				})
			}

			const answerText = isFav ? 'Видалено' : 'Добавлено'
			userPromise.save().then(_ => {
				bot.answerCallbackQuery({
					callback_query_id: queryId,
					text: answerText
				})
			})
		})
}

function showFovouriteFilms (chatId, userId) {
	User.findOne({telegramId: userId})
		.then(user => {
			if (user) {
				
				Film.find({uuid: {'$in': user.films}}).then(films => {
					let html

					if (films.length) {
						console.log(films.length);
						html = films.map((f, i) => {
							return `<b>${i + 1}</b> ${f.name} - <b>${f.rate}</b> (/f${f.uuid})`
						}).join('\n')
					} else   {
						html = 'Ви поки нічого не добавили'
					}

					sendHTML(chatId, html, 'home')
				}).catch(err => console.log(err))
			} else {
				sendHTML(chatId, 'Ви поки нічого не добавили', 'home')
			}
		})
}

function sendCinemasByQuery (userId, query) {
	Cinema.find(query).then(cinemas => {
		const html = cinemas.map((c, i) => {
			return `<b>${i + 1}</b> ${c.name} - /c${c.uuid}`
		}).join('\n')
		sendHTML(userId, html, 'home')
	})	
}