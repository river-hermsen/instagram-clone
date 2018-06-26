var express = require('express');
var router = express.Router();
var multer = require('multer')
const path = require('path');
var User = require('../models/user');

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  } else {
    // req.flash('error_msg', 'You are not logged in');
    res.redirect('/account/login');
  }
}

// Get Homepage
router.get('/', ensureAuthenticated, function(req, res) {
  res.render('index');
});

module.exports = router;
