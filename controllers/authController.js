const passport = require('passport');
const mongoose = require('mongoose');
const User = mongoose.model('User');
const crypto = require('crypto');
const promisify = require('es6-promisify');
const mail = require('../handlers/mail');

exports.login = passport.authenticate('local', {
  failureRedirect: '/login',
  failureFlash: 'Failed Login!',
  successRedirect: '/',
  successFlash: 'You\'re logged in!'
});

exports.logout = (req, res) => {
  req.logout();
  req.flash('success', 'You\'re now logged out  👋🏻');
  res.redirect('/');
}

exports.isLoggedIn = (req, res, next) => {
  // check if user is auth
  if(req.isAuthenticated()) {
    next(); // they are logged in
    return;
  }
  req.flash('error', 'Oops! You\'re not logged in.');
  res.redirect('/login');
}

exports.forgot = async (req, res) => {
  // 1. See if user exists
  const user = await User.findOne({email: req.body.email});
  if(!user) {
    req.flash('error', 'Couldn\'t find a user with that email');
    return res.redirect('/login');
  }
  // 2. set the reset token and expirey on their account
  user.resetPasswordToken = crypto.randomBytes(20).toString('hex');
  user.resetPassowrdExpires = Date.now() + 3600000; // 1 hour from now
  await user.save();
  // 3. Send the user an email
  const resetURL = `http://${req.headers.host}/account/reset/${user.resetPasswordToken}`;
  mail.send({
    user,
    subject: 'Password Reset',
    resetURL,
    filename: 'password-reset'
  });
  req.flash('success', `You have been emailed a password reset link.`);
  // 4. redirect to login page
  res.redirect('/login');
}

exports.reset = async (req, res) => {
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPassowrdExpires: {$gt: Date.now()}
  });
  if (!user) {
    req.flash('error', 'Password reset is invalid or expired');
    return res.redirect('/login');
  }
  // if there is a user, show the reset form
  res.render('reset', {title: "Reset your password"});
}

exports.confirmedPasswords = (req, res, next) => {
  if (req.body.password === req.body['password-confirm']) {
    next();
    return;
  }
  req.flash('error', 'Passwords do not match!');
  res.redirect('back');    
};

exports.update = async (req, res) => {
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPassowrdExpires: {$gt: Date.now()}
  });
  if (!user) {
    req.flash('error', 'Password reset is invalid or expired');
    return res.redirect('/login');
  }
  const setPassword = promisify(user.setPassword, user);
  await setPassword(req.body.password);
  user.resetPasswordToken = undefined;
  user.resetPassowrdExpires = undefined;
  const updatedUser = await user.save();
  await req.login(updatedUser);
  req.flash('success', '🕺🏿 Sweet! Your password has been reset! You\'re logged in now.');
  res.redirect('/');
}



