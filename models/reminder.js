var mongoose = require('mongoose');

module.exports = mongoose.model('Reminder', {
	userId: String,
	list: [String]
});