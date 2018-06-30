var express = require('express');
var router = express.Router();
var multer = require('multer')
const path = require('path');
var User = require('../models/user');
var Photo = require('../models/photo');

// Get Homepage
router.get('/', function(req, res) {
  Photo.find({}, function(err, photos) {
    addUserInfo(photos);
  });

  function addUserInfo(photos) {
    var updatedPhotos = [];
    for (let i = 0; i < photos.length; i++) {
      var userId = photos[i].userId;
      getUserInfo(userId, photos[i]).then((updatedPhoto) => {
        updatedPhotos.push(updatedPhoto)
        if (i == photos.length - 1) {
          res.render('index', {
            photos: updatedPhotos
          });
        }
      })
    }
  }

  function getUserInfo(userId, photo) {
    return new Promise((resolve, reject) => {
      User.getUserById(userId, function(err, user) {
        userInfo = {
          id: photo.userId,
          username: user.username,
          profilePicture: user.profilePicture
        };
        updatedPhoto = {
          infoPhoto: photo.infoPhoto,
          likesAndComments: photo.likesAndComments,
          _id: photo._id,
          userInfo: userInfo
        };
        resolve(updatedPhoto);
      })
    });
  }
});

// Get upload page
router.get('/upload', function(req, res) {
  res.render('upload');
});

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  } else {
    // req.flash('error_msg', 'You are not logged in');
    res.redirect('/account/login');
  }
}

// Set The Storage Engine
const storage = multer.diskStorage({
  destination: './public/uploads/photos',
  filename: function(req, file, cb) {
    cb(null, Date.now() + '-' + file.fieldname + path.extname(file.originalname));
  }
});

// Init Upload
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1000000
  },
  fileFilter: function(req, file, cb) {
    checkFileType(file, cb);
  }
}).single('img');

// Check File Type
function checkFileType(file, cb) {
  // Allowed ext
  const filetypes = /jpeg|jpg|png|gif/;
  // Check ext
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  // Check mime
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb('Error: Images Only!');
  }
}


router.post('/upload', function(req, res) {
  var userId = req.user._id;
  upload(req, res, function(err) {
    if (err) {
      console.log(err);
      req.flash('error_msg', 'Failed to upload image to server.');
      res.redirect('back');
    } else {
      if (req.file == undefined) {
        req.flash('error_msg', 'No file selected');
        res.redirect('back');
      } else {
        var description = req.body.description;
        var photoUpload = new Photo({
          userId: userId,
          infoPhoto: {
            description: description,
            filename: req.file.filename
          }
        });
        photoUpload.save(function(err) {
          if (err) {
            req.flash('error_msg', 'Failed to upload image to database.');
            res.redirect('back');
          } else {
            req.flash('success_msg', 'Uploaded photo.');
            res.redirect('/');
          }
        });
      }
    }
  })
});

router.post('/add/comment/:photoId', function(req, res) {
  var userId = req.user._id.toString();
  var username = req.user.username;
  var photoId = req.params.photoId;
  var comment = req.body.comment;
  Photo.findById(photoId, function(err, photo) {
    if (err) {
      console.log(err);
      res.send('failed yo shit')
    } else {
      photo.likesAndComments.comments.push({
        userId: userId,
        username: username,
        comment: comment
      })
      photo.save();
      res.send({
        userId: userId,
        username: username,
        comment: comment
      });
    }
  });
});

module.exports = router;
