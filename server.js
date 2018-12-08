var express = require("express");
var mongoose = require("mongoose");
var path = require('path');
// Our scraping tools
// Axios is a promised-based http library, similar to jQuery's Ajax method
// It works on the client and on the server
var axios = require("axios");
var cheerio = require("cheerio");

// Require all models
var db = require("./models");

// Initialize Express
var app = express();

// Configure middleware

// Parse request body as JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Make public a static folder
app.use(express.static("public"));

// Connect to the Mongo DB
// If deployed, use the deployed database. Otherwise use the local mongoHeadlines database
var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/mongoHeadlines";
var PORT = process.env.PORT || 3000;

// Set mongoose to leverage built in JavaScript ES6 Promises
// Connect to the Mongo DB
mongoose.Promise = Promise;
mongoose.connect(MONGODB_URI, { useNewUrlParser: true });

// Routes
// A GET route for scraping the echoJS website
app.get("/scrape", function (req, res) {
  // First, we grab the body of the html with axios
  axios.get("https://www.economist.com/latest/").then(function (response) {
    // Then, we load that into cheerio and save it to $ for a shorthand selector

    //console.log(response.data);
    var $ = cheerio.load(response.data);
    var stats = {
      inserted: 0,
      error: 0
    };

    // Now, we grab every h2 within an article tag, and do the following:
    var promises = $("article").map(function (i, element) {
      // Save an empty result object
      var result = {};

      result.headline = $(".flytitle-and-title__title", this)
        .text();
      result.url = $("a", this)
        .attr("href");

      result.summary = $(".teaser__text", this).text();

      // Create a new Article using the `result` object built from scraping
      return db.Article.create(result)
        .then(v => {
          stats.inserted++;
          return { status: "fulfilled" };
        }, e => {
          stats.error++;
          console.error(e);
          return { status: "rejected" };
        });
    });

    Promise.all(promises.toArray().map(p => p.catch(e => e)))
      .then(function (result) {
        res.json(stats);
      });
  });
});

// Route for getting all Articles from the db
app.get("/articles", function (req, res) {
  // Grab every document in the Articles collection
  db.Article.find({})
    .populate('comments')
    .sort({ date: -1 })
    .then(function (dbArticle) {
      // If we were able to successfully find Articles, send them back to the client
      res.json(dbArticle);
    })
    .catch(function (err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for grabbing a specific Article by id, populate it with it's comments
app.get("/articles/:id", function (req, res) {
  // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
  db.Article.findOne({ _id: req.params.id })
    // ..and populate all of the notes associated with it
    .populate("comments")
    .then(function (dbArticle) {
      // If we were able to successfully find an Article with the given id, send it back to the client
      res.json(dbArticle);
    })
    .catch(function (err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for saving/updating an Article's associated Comments
app.post("/articles/:id", function (req, res) {
  // find if there's an article with provided article id
  // create a Comment document
  // push comment to article and save
  db.Article.findOne({ _id: req.params.id })
    .populate('comments')
    .then(function (dbArticle) {
      // Create a new note and pass the req.body to the entry
      db.Comment.create(req.body)
        .then(function (dbComment) {
          dbArticle.comments.push(dbComment);
          return dbArticle.save();
        })
        .then(function (dbArticle) {
          // If we were able to successfully update an Article, send it back to the client
          res.json(dbArticle);
        })
        .catch(function (err) {
          // If an error occurred, send it to the client
          res.json(err);
        });
    })
    .catch(function (err) {
      // If an error occurred, send it to the client
      res.status(500).send('Article not found');
    });
});

// Route for deleting a comment
app.delete("/comments/:id", function (req, res) {
  db.Comment.deleteOne({ _id: req.params.id }, function (err) {
    if (err) return handleError(err);
    // deleted at most one document
    res.send("deleted");
  });
});

app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname, "./public/index.html"));
});
// Start the server
app.listen(PORT, function () {
  console.log("App running on port " + PORT + "!");
});