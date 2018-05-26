const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const slug = require('slugs');

/* pro tip*** do all data normalization as close to the model as possible */
const storeSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
  },
  slug: String,
  description: {
    type: String,
    trim: true,
  },
  tags: [String],
});

storeSchema.pre('save', function(next) {
  if (!this.isModified('name')) {
    next(); // skip it
    return; // exit this function
  }
  this.slug = slug(this.name);
  next();
  // TODO make more resillience so slugs are unique
});

module.exports = mongoose.model('Store', storeSchema);
