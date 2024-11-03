// install applicition
const express = require('express');
var morgan = require('morgan');
var cookieParser = require('cookie-parser');
var cors = require('cors');


// set app
const app = express();


// use middleware in app
app.use(express.json());
app.use(morgan('dev'));
app.use(cookieParser());
app.use(cors());


// set port location
const port = process.env.PORT || 5000;


// home root
app.get('/', (req, res) => {
    res.send('Welcome To RK® Resturent')
})



app.listen(port, () => {
    console.log(`server run by : ${port}`)
})