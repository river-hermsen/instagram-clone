var mongoose = require('mongoose');
var bcrypt = require('bcryptjs');

var PhotoSchema = mongoose.Schema({
  userId: {
    type: String
  },
  infoPhoto: {
    filename: String,
    description: String,
    timestampUploaded: Date
  },
  likesAndComments: {
    likes: {
      likers: Array
    },
    comments: {
      type: Array
      // commenters: {
      //   userId: String,
      //   comment: String
      // }
    }
  }
}, {
  strict: false
});

var Photo = module.exports = mongoose.model('Photo', PhotoSchema);

module.exports.uploadPhoto = function(Photo, callback) {

};
