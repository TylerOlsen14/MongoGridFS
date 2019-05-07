const express = require('express');
const bodyParser = require('body-parser')
const path = require('path'); // core node mondule
const crypto = require('crypto'); // core node mondule
const mongoose = require('mongoose')
const multer = require('multer')
const GridFsStorage = require('multer-gridfs-storage')
const Grid = require('gridfs-stream')
const methodOverride = require('method-override')


const app = express();

// Middleware
app.use(bodyParser.json())
app.use(methodOverride('_method')) // tells it that we want to use a query string to make a delete request
app.set('view engine', 'ejs');

// Mongo URI
const mongoURI = 'mongodb+srv://Tucker:Tucker@cluster0-tihhu.mongodb.net/test?retryWrites=true'

// Create mongo connection
const conn = mongoose.createConnection(mongoURI)

// initialize variable for GFS Stream
let gfs;

conn.once('open', () => {
  //initialize the stream
  gfs = Grid(conn.db, mongoose.mongo)
  gfs.collection('uploads')
})

// Create storage engine
const storage = new GridFsStorage({
  url: mongoURI,
  file: (req, file) => {
    return new Promise((resolve, reject) => { // sets up a promise here
    crypto.randomBytes(16, (err, buf) => { // method that generates names for the DB
      if (err) {
        return reject(err);
      }
      const filename = buf.toString('hex') + path.extname(file.originalname);
      const fileInfo = {
        filename: filename,
        bucketName: 'uploads'
      };
      resolve(fileInfo)
    })
  })
  }
})
const upload = multer({ storage }) //acts as the middleware for index.ejs 

// @route GET /
// @desc Loads form
app.get('/', (req, res) => {
  res.render('index')
})

// @route POST /upload
// @desc Uploads file to DB
app.post('/upload', upload.single('file'), (req, res) => {// .single => meant to upload a single file
  // res.json({file: req.file})
  res.redirect('/')
})

// @route GET /files
// @desc display all files in JSON
app.get('/files', (req, res) =>{
  gfs.files.find().toArray((err, files) => {
    // check to see if files exist
    if(!files || files.length === 0){
      return res.status(404).json({
        error: "No files exist"
      })
    }
    // Files do exist
    return res.json(files);
  })
})

// @route GET /files
// @desc display single file object in JSON
app.get('/files/:filename', (req, res) =>{
  gfs.files.findOne({filename: req.params.filename}, (err, file) => {
    // check to see if file exists
    if(!file || file.length === 0){
      return res.status(404).json({
        error: "No files exist"
      })
    }
    // File does exist
    return res.json(file);
  })
})

// @route GET /image/"filename"
// @desc Display image
app.get('/image/:filename', (req, res) =>{
  gfs.files.findOne({filename: req.params.filename}, (err, file) => {
    // check to see if file exists
    if(!file || file.length === 0){
      return res.status(404).json({
        error: "No files exist"
      })
    }
    // Check if image
    if(file.contentType === 'image/jpeg' || file.contentType === 'img/png') {
      // Read output to browser
      const readstream = gfs.createReadStream(file.filename);
        readstream.pipe(res)
    } else {
      res.status(404).json({
        err: 'Not an image'
      })
    }
  })
})




const port = 5000;

app.listen(port, () => console.log(`Server started on port ${port}`))