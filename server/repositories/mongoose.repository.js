class MongooseRepository {
  constructor(Model) {
    this.Model = Model;
  }

  find(filter, projection) {
    return this.Model.find(filter, projection);
  }

  findOne(filter, projection) {
    return this.Model.findOne(filter, projection);
  }

  findById(id, projection) {
    return this.Model.findById(id, projection);
  }

  countDocuments(filter) {
    return this.Model.countDocuments(filter);
  }

  exists(filter) {
    return this.Model.exists(filter);
  }

  insertMany(documents) {
    return this.Model.insertMany(documents);
  }

  findOneAndUpdate(filter, update, options) {
    return this.Model.findOneAndUpdate(filter, update, options);
  }

  findOneAndDelete(filter) {
    return this.Model.findOneAndDelete(filter);
  }

  deleteMany(filter) {
    return this.Model.deleteMany(filter);
  }

  create(data) {
    return new this.Model(data).save();
  }
}

module.exports = MongooseRepository;
