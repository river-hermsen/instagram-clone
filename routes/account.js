//  Requiring node modules
var express = require('express');
var router = express.Router();
var passport = require('passport');
var passport = require('passport'),
  FacebookStrategy = require('passport-facebook').Strategy,
  LocalStrategy = require('passport-local').Strategy,
  GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var crypto = require("crypto");
var nodemailer = require("nodemailer");
var async = require("async");
var mongoose = require('mongoose');
var findOrCreate = require('mongoose-findorcreate');
var User = require('../models/user');

//  Passport.JS local Strategy
passport.use(new LocalStrategy({
    usernameField: 'email',
  },
  function(email, password, done) {
    User.getUserByEmail(email, function(err, user) {
      if (err) throw err;
      if (!user) {
        return done(null, false, {
          error_msg: 'Unknown user'
        })
      }

      User.comparePassword(password, user.password, function(err, isMatch) {
        if (err) throw err;
        if (isMatch) {
          return done(null, user);
        } else {
          return done(null, false, {
            error_msg: 'Invalid password'
          });
        }
      })
    });
  }
));

//  Passport.JS Facebook Strategy
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "http://localhost:3000/account/auth/facebook/callback",
    profileFields: ['id', 'displayName', 'name', 'gender', 'email']
  },
  function(accessToken, refreshToken, profile, done) {
    User.findOne({
      facebookId: profile.id,
    }, function(err, user) {
      if (err) {
        return done(err);
      };
      if (user) {
        console.log(user);
        return done(null, user);
      };
      var emailsUser = [];
      for (var i = 0; i < profile.emails.length; i++) {
        emailsUser.push(profile.emails[i].value);
      };
      var newUser = new User({
        facebookId: profile.id,
        displayName: profile.displayName,
        // name: {
        //   familyName: profile.name.familyName,
        //   givenName: profile.name.givenName,
        //   middleName: profile.name.middleName
        // },
        gender: profile.gender,
        emails: emailsUser
      });
      newUser.save(function(err) {
        if (err) return done(err);

        return done(null, newUser);
      });
    });
  }
));

//  Passport.JS Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/account/auth/google/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    User.findOne({
      googleId: profile.id,
    }, function(err, user) {
      if (err) {
        return done(err);
      };
      if (user) {
        return done(null, user);
      };
      var emailsUser = [];
      for (var i = 0; i < profile.emails.length; i++) {
        emailsUser.push(profile.emails[i].value);
      };
      var newUser = new User({
        googleId: profile.id,
        displayName: profile.displayName,
        // name: {
        //   familyName: profile.name.familyName,
        //   givenName: profile.name.givenName,
        //   middleName: profile.name.middleName
        // },
        gender: profile.gender,
        emails: emailsUser
      });
      newUser.save(function(err) {
        if (err) return done(err);

        return done(null, newUser);
      });
    });
  }
));

//GET /account/auth/google
//    Authentication with google route
router.get('/auth/google',
  passport.authenticate('google', {
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email'
    ]
  })
);

//GET /account/auth/google/callback
//    Callback from google authentication uses passport.authenticate()
//    as middleware to check if authentication with google succeeded.
router.get('/auth/google/callback',
  passport.authenticate('google', {
    successRedirect: '/',
    failureRedirect: '/account/login',
    failureFlash: 'Failed to login with Google.'
  }),
  function(req, res) {
    // This function gets called when authentication was successful.
    // res.redirect('/');
  }
);

router.get('/auth/facebook',
  passport.authenticate('facebook', {
    scope: ['email', 'user_friends', 'manage_pages']
  })
);

router.get('/auth/facebook/callback',
  passport.authenticate('facebook', {
    successRedirect: '/',
    failureRedirect: '/account/login',
    failureFlash: 'Failed to login with Facebook.'
  })
);


//GET /account/register
//  Local register route
router.get('/register', function(req, res) {
  res.render('account/register');
});

//GET /account/login
//    Local login route
router.get('/login', function(req, res) {
  res.render('account/login');
});

//POST /account/register
//    Register local User
router.post('/register', function(req, res) {
  var displayName = req.body.name;
  var username = req.body.username;
  var email = req.body.email;
  var password = req.body.password;
  var password2 = req.body.password2;

  //  Validation of local user
  req.checkBody('name', 'Full name is required').notEmpty();
  req.checkBody('username', 'Username is required').notEmpty();
  req.checkBody('email', 'Email is not valid').isEmail();
  req.checkBody('password', 'Password is required and has to be a minimum length of 8 characters.').notEmpty().isLength({
    min: 8
  });
  req.checkBody('password2', 'Passwords do not match').equals(req.body.password);

  var errors = req.validationErrors();

  if (errors) {
    res.render('account/register', {
      errors
    })
  } else {
    var newUser = new User({
      displayName,
      username,
      emails: [email],
      password
    });

    User.createLocalUser(newUser, function(err, user) {
      if (err) throw err;
    });

    req.flash('success_msg', 'You are registered and can now login');
    res.redirect('login');
  }
});

//POST /account/login
//    Passport local strategy to authenticate login credentials
router.post('/login',
  passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/account/login',
    failureFlash: 'Wrong login credentials.'
  }),
  function(req, res) {
    // This function gets called when authentication was successful.
    res.redirect('/account/' + req.user.username);
  }
);

//  Passport.JS Serialize user for session logins
passport.serializeUser(function(user, done) {
  done(null, user);
});

//  Passport.JS Deserialize user for session logins
passport.deserializeUser(function(id, done) {
  User.getUserById(id, function(err, user) {
    done(err, user);
  });
});


//GET /account/logout
//    Logs out user route
router.get('/logout', function(req, res) {
  req.logout();
  // req.flash('success_msg', 'You are logged out');
  res.redirect('/account/login');
})

//GET /account/forgot
//    When user forgot password
router.get('/forgot', function(req, res) {
  res.render('account/forgot');
});

//POST /account/forgot
//  Send email with link to reset password
router.post('/forgot', function(req, res) {
  async.waterfall([
    function(done) {
      //  Creates resetPasswordToken
      require('crypto').randomBytes(24, function(err, buffer) {
        var token = buffer.toString('hex');
        done(err, token);
      });
    },
    function(token, done) {
      //  Check if email exists in DB
      User.findOne({
        email: req.body.email
      }, function(err, user) {
        if (!user) {
          req.flash('error_msg', 'No account with that email address exists.');
          return res.redirect('/account/forgot');
        }
        //  Saves resetPasswordToken and resetPasswordExpires and updates the user in in the DB.
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        user.save(function(err) {
          done(err, token, user);
        });
      });
    },
    function(token, user, done) {
      //  Setup nodemailer
      var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'hermsenzwaan@gmail.com',
          pass: process.env.gmail_pass
        }

      });
      //  Creates an email with a link to reset password
      var mailOptions = {
        from: 'hermsenzwaan@gmail.com',
        to: user.email,
        subject: 'Resetting your password',
        html: '<p>Your link to resetting your password: </br> <a href="http://' + req.headers.host + '/account/reset?token=' + token + '">Resetting your password</a></p>' // html body
      };
      //  Send email with nodemailer
      transporter.sendMail(mailOptions, function(error) {
        if (error) {
          req.flash('error_msg', 'Sending an email with further instructions to ' + user.email + ' has failed.');
          done(err, false);
        } else {
          req.flash('success_msg', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
          res.redirect('/account/forgot')
          done(err, 'done');
        }
      });
    }
  ], function(err) {
    if (err) return next(err);
    res.redirect('/account/forgot')
  });
});

//GET /account/reset
//  Resetting password route
router.get('/reset', function(req, res) {
  //  Checks if a token is in the url
  if (!req.query.token) {
    req.flash('error', 'Password reset token is invalid or has expired.');
    return res.redirect('/account/forgot');
  }
  //  Check to see if token hasn't expired
  User.findOne({
    resetPasswordToken: req.query.token,
    resetPasswordExpires: {
      $gt: Date.now()
    }
  }, function(err, user) {
    //  Checks if token belongs to the user in the DB
    if (!user) {
      req.flash('error', 'Password reset token is invalid or has expired.');
      return res.redirect('/account/forgot');
    }
    //  Gets executed when token is valid and has not expired
    res.render('account/reset', {
      token: req.query.token
    });
  });
});

//POST /account/reset
router.post('/reset', function(req, res) {
  //  Checks if a token is in the url
  if (!req.query.token) {
    req.flash('error', 'Password reset token is invalid or has expired.');
    return res.redirect('/account/forgot');
  }
  async.waterfall([
    function(done) {
      //  Check to see if token hasn't expired
      User.findOne({
        resetPasswordToken: req.query.token,
        resetPasswordExpires: {
          $gt: Date.now()
        }
      }, function(err, user) {
        //  Checks if token belongs to the user in the DB
        if (!user) {
          req.flash('error', 'Password reset token is invalid or has expired.');
          return res.redirect('back');
        }
        // Validation for the password
        req.checkBody('password', 'Password is required and has to be a minimum length of 8 characters.').notEmpty().isLength({
          min: 8
        });
        req.checkBody('password2', 'Passwords do not match').equals(req.body.password);
        var errors = req.validationErrors();

        if (errors) {
          return res.render('account/reset', {
            errors
          })
        };
        // Changes password if token is valid and hasn't expired
        User.changePassword(user, req.body.password, function() {
          if (err) throw err;
          req.flash('success_msg', 'Your password has now been changed');
          res.redirect('/account/login');
          done();
        });
      });
    }
  ]);
});

module.exports = router;
