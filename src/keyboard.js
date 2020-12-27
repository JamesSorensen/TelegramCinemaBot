const kb = require('./keyboard_button');

module.exports = {
	home: [
		[kb.home.films, kb.home.cinemas],
		[kb.home.favorite]
	],
	films: [
		[kb.film.random],
		[kb.film.action, kb.film.comedy],
		[kb.back]
	],
	cinemas: [
		[
			{
				text: 'Відправити містцезнаходження',
				request_location: true
			}
		],
		[kb.back]
	]
}