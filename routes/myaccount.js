var express = require('express');
var router = express.Router();
var multer = require('multer')
const path = require('path');
var User = require('../models/user');
const fs = require('fs');

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  } else {
    // req.flash('error_msg', 'You are not logged in');
    res.redirect('/account/login');
  }
}

router.get('/myaccount', function(req, res) {
  res.render('myaccount');
});

// Set The Storage Engine
const storage = multer.diskStorage({
  destination: './public/uploads/profilePicture',
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
}).single('myImage');

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


router.post('/myaccount/upload', ensureAuthenticated, function(req, res) {
  upload(req, res, function(err) {
    if (err) {
      // var nonJSONerr = JSON.stringify(err);
      // console.log(err);
      req.flash('error_msg', 'Error in uploading file to server');
      res.redirect('back');
    } else {
      if (req.file == undefined) {
        req.flash('error_msg', 'No file selected');
        res.redirect('back');
      } else {
        User.getUserById(req.user._id, function(err, user) {
          if (err) {
            req.flash('error_msg', 'Can\'t find user.');
            res.redirect('back');
          } else {
            if (user.profilePicture !== 'default.png') {
              fs.unlink('./public/uploads/profilePicture/' + user.profilePicture, (err) => {
                if (err) throw err;
                console.log('path/file.txt was deleted');
              });
            }

            user.profilePicture = req.file.filename;
            user.save(function(err) {
              if (err) {
                req.flash('error_msg', 'Can\'t find user.');
                res.redirect('back');
              } else {
                req.flash('success_msg', 'Your profile picture has been successfully updated.');
                res.redirect('back');
              }
            });
          }
        });
      }
    }
  });
});

router.post('/myaccount/edit', ensureAuthenticated, function(req, res) {
  var displayName = req.body.name;
  var username = req.body.username;
  var email = req.body.email;
  var gender = req.body.gender;
  //  Validation of local user
  req.checkBody('name', 'Full name is required').notEmpty();
  req.checkBody('username', 'Username is required and has to be a minimum length of 6 characters.').notEmpty().isLength({
    min: 6
  });;
  req.checkBody('email', 'Email is not valid').isEmail();
  console.log(username);
  var errors = req.validationErrors();

  if (errors) {
    res.render('account/register', {
      errors
    })
  } else {
    User.getUserById(req.user._id, function(err, user) {
      user.displayName = displayName;
      user.username = username;
      user.email = email;
      user.gender = gender;
      user.save(function(err) {
        if (err) {
          req.flash('error_msg', 'Something went wrong. Try again.');
          res.redirect('back');
        } else {
          req.flash('success_msg', 'Profile data successfully updated.');
          res.redirect('back');
        }
      })
    })
  }
});

module.exports = router;
