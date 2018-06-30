var express = require('express');
var router = express.Router();
var multer = require('multer')
const path = require('path');
var User = require('../models/user');
var Photo = require('../models/photo');

// Get Homepage
router.get('/', function(req, res) {
  res.render('index');
});

router.get('/:id', function(req, res) {
  res.send(req.params)
});

module.exports = router;
