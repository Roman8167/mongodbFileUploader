const express = require("express");
const app = express();
const path = require("path");
const ejs = require("ejs")
const crypto = require("crypto");
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require("gridfs-stream");
const mongoose = require('mongoose');
const methodOverride = require("method-override");
const url = "mongodb://localhost:27017/uploads";
const bodyParser = require("body-parser");
//set some variables if possible
app.set("view engine","ejs");
app.use(bodyParser.json());
app.use(methodOverride("_method"));
//creating a connection using mongodb and gridFs
const conn = mongoose.createConnection(url);
var gfs;
conn.once("open",function(){
  gfs = Grid(conn.db,mongoose.mongo);
  gfs.collection("uploads");
  console.log("Connected to Mongodb....")
})
app.get("/",function(req,res){
  gfs.files.find().toArray((err,files)=>{
    if(!files||files.length===0){
      res.render("index.ejs",{files:false})
    }
    files.map(file=>{
      if(file.contentType==='image/jpeg'||file.contentType==='image/png'){
        file.isImage=true
      }
      else{
        file.isImage=false
      }
    });
    res.render("index.ejs",{files:files})
  })
})
var storage = new GridFsStorage({
  url: url,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        const filename = buf.toString('hex') + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: 'uploads'
        };
        resolve(fileInfo);
      });
    });
  }
});
const upload = multer({ storage });
app.post("/upload",upload.single("file"),function(req,res){
    res.redirect("/")
});
app.get("/files",function(req,res){
  gfs.files.find().toArray(function(err,files){
    if(!files||files.length===0){
      return res.status(404).json({err:err})
    }
    return res.json(files)
  })
});
///fetching data using _id
app.get("/files/:filename",function(req,res){
  gfs.files.findOne({filename:req.params.filename},(err,file)=>{
    if(!file||file.length===0){
      return res.status(404).json({err:err})
    }
    return res.json(file)
  })
});
///displaying image using createReadStream
app.get("/image/:filename",function(req,res){
    gfs.files.findOne({filename:req.params.filename},(err,file)=>{
      if(!file||file.length===0){
        return res.status(404).json({err:err})
      }
      if(file.contentType==='image/jpeg'||file.contentType==='image/png'){
        var readStream = gfs.createReadStream(file.filename);
        readStream.pipe(res)

      }
      else{
        return res.status(404).json({err:err})
      }
      
    })
});
app.delete("/files/:filename",function(req,res){
  gfs.remove({filename:req.params.filename,root:"uploads"},(err,gridStore)=>{
    if(err){
      return res.status(404).json({err:err})
    }
    res.redirect("/")
  })
})

const port = 3000;
app.listen(port,()=>{
  console.log(`Server is up and running at port ${port}`)
})