var mongoose = require('mongoose');
var bcrypt = require('bcryptjs');
var findOrCreate = require('mongoose-findorcreate')

var UserSchema = mongoose.Schema({
  facebookId: {
    type: Number
  },
  googleId: {
    type: Number
  },
  displayName: {
    type: String,
    default: null
  },
  username: {
    type: String,
    default: null,
    trim: true
  },
  password: {
    type: String
  },
  emails: {
    type: Array
  },
  gender: {
    type: String
  },
  profilePicture: {
    type: String,
    default: 'default.png'
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date
}, {
  strict: false
});
UserSchema.plugin(findOrCreate);

var User = module.exports = mongoose.model('User', UserSchema);

module.exports.createLocalUser = function(newUser, callback) {
  bcrypt.genSalt(10, function(err, salt) {
    bcrypt.hash(newUser.password, salt, function(err, hash) {
      newUser.password = hash;
      newUser.save(callback);
    });
  });
};

module.exports.createGoogleUser = function(newUser, callbackCreating) {
  var query = {
    email: newUser.email
  };
  User.findAndModify({
    query: {
      _id: "some potentially existing id"
    },
    update: {
      $setOnInsert: {
        foo: "bar"
      }
    },
    new: true, // return new doc if one is upserted
    upsert: true // insert the document if it does not exist
  }, function(err, user) {
    console.log(user);
    return user
  })
};

module.exports.getUserByUsername = function(username, callback) {
  var query = {
    username: username
  };
  User.findOne(query, callback);
};

module.exports.getUserByEmail = function(email, callback) {
  var query = {
    emails: [email]
  };
  User.findOne(query, callback);
};


module.exports.comparePassword = function(candidatePassword, hash, callback) {
  bcrypt.compare(candidatePassword, hash, function(err, isMatch) {
    if (err) throw err;
    callback(null, isMatch)
  });
};

module.exports.changePassword = function(user, newPassword, callback) {
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;

  bcrypt.genSalt(10, function(err, salt) {
    bcrypt.hash(newPassword, salt, function(err, hash) {
      user.password = hash;
      user.save(callback);
    });
  });
};

module.exports.getUserById = function(id, callback) {
  User.findById(id, callback);
};
