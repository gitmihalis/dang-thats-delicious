const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const slug = require('slugs');

const storeSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: 'Please enter a store name!'
  },
  slug: String,
  description: {
    type: String,
    trim: true
  },
  tags: [String],
  created: {
    type: Date,
    default: Date.now
  },
  location: {
    type: {
      type: String,
      default: 'Point'
    },
    coordinates: [{
      type: Number,
      required: 'You must supply coordinates!'
    }],
    address: {
      type: String,
      required: 'You must supply an address!'
    }
  },
  photo: String,
  author: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: 'You must supplu an author'
  },
}, {
  toJSON: { virtuals: true},
  toObject: { virtuals: true}
});

// Define the indexes
storeSchema.index({location: '2dsphere'});
storeSchema.index({
  name: 'text',
  description: 'text',
});



storeSchema.pre('save', async function(next) {
  if (!this.isModified('name')) {
    next(); // skip it
    return; // stop this function from running
  }
  this.slug = slug(this.name);
  // find other stores that have a slug of wes, wes-1, wes-2
  const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]*$)?)$`, 'i');
  const storesWithSlug = await this.constructor.find({slug: slugRegEx});
  if (storesWithSlug.length) {
    this.slug = `${this.slug}-${storesWithSlug.length + 1}`;
  }
  next();
});

storeSchema.statics.getTagsList = function() {
  return this.aggregate([
    /* unwind will give us the [duplicate] Stores for each tag. For exmaple, 
    Tim Hortons will be unwound twice because it has Wifi & it's Family Friendly */
    { $unwind: '$tags' }, 
    // group the stores by their tags, and create a new field called count
    { $group: { _id: '$tags', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
}

storeSchema.statics.getTopStores = function() {
  return this.aggregate([
    // lookup stores and populate their reviewers
    { $lookup: { from: 'reviews', localField: '_id', foreignField: 'store', as: 'reviews' }},
    // filter for stores that have 2 or more reviews
    { $match: { 'reviews.1': { $exists: true} }},
    // add the average review field
    { $project: {
      photo: '$$ROOT.photo',
      name: '$$ROOT.name',
      reviews: '$$ROOT.reviews',
      slug: '$$ROOT.slug',
      averageRating: { $avg: '$reviews.rating'}
    }},
    // sort by this new field, highest first
    { $sort: { averageRating: -1 }},
    // limit to most at 10
    { $limit: 10 }
  ]);
}

/* Find reviews where the store's _id prop === review's store prop. By default
  virtual fields do not go into an object or json unless you explicitly ask. To
  change the default, set toJSON, toObject in the Schema.
*/
  
storeSchema.virtual('reviews', {
  ref: 'Review', // model to link
  localField: '_id', // field on store
  foreignField: 'store' // field on review
});

function autopopulate(next) {
  this.populate('reviews');
  next()
}

storeSchema.pre('find', autopopulate);
storeSchema.pre('findOne', autopopulate);

module.exports = mongoose.model('Store', storeSchema);
