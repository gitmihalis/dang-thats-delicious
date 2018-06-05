const mongoose = require('mongoose');
const User = mongoose.model('User');
const promisify = require('es6-promisify');

exports.loginForm = (req, res) => {
  res.render('login', {title: 'Login Form'});
}

exports.registerForm = (req, res) => {
  res.render('register', {title: 'Register'})
}

// Build middleware to do validation
exports.validateRegister = (req, res, next) => {
  req.sanitizeBody('name');
  req.checkBody('name', 'You need to supply a name!').notEmpty();
  req.checkBody('email', 'That email is not valid!').isEmail();
  req.sanitizeBody('email').normalizeEmail({
    remove_dots: false,
    remove_extension: false,
    gmail_remove_subaddress: false,
  });
  req.checkBody('password', 'Password can\'t be blank').notEmpty();
  req.checkBody('password-confirm', 'Confirmed password can\'t be blank').notEmpty();
  req.checkBody('password-confirm', 'Uh-oh! Those passwords don\'t match!').equals(req.body.password);

  const errors = req.validationErrors();
  if (errors) {
    req.flash('error', errors.map(err => err.msg));
    res.render('register', {title: 'Register', body: req.body, flashes: req.flash()});
    return; // halt the function
  }
  next(); // Move along, there were no errors.
}

exports.register = async (req, res, next) => {
  const user = new User({email: req.body.email, name: req.body.name});
  const registerWithPromise = promisify(User.register, User); // wrap in a promise
  await registerWithPromise(user, req.body.password);
  next();
}