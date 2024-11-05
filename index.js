// install applicition
const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
var morgan = require('morgan');
var cookieParser = require('cookie-parser');
var cors = require('cors');
require('dotenv').config()

// set app
const app = express();

// use middleware in app
app.use(express.json());
app.use(morgan('dev'));
app.use(cookieParser());
app.use(cors({
    origin: ["http://localhost:5173"],
    credentials: true,
}));

// set port location
const port = process.env.PORT || 5000;



const uri = process.env.mongo_uri;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});
async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        // Get the database and collection on which to run the operation
        const database = client.db("Rk_Resturent");


        // not private root
        const food_menu = database.collection("foods_menu");   // food Menu part
        // find all data from foods_menu with body filter
        app.get('/food_menu', async (req, res) => {
            const cursor = food_menu.find({});
            const result = await cursor.toArray();
            res.send(result);
        })
        // find sum data from foods_menu with body filter
        app.post('/food_menu_filter', async (req, res) => {
            const body = req.body;
            const cursor = food_menu.find(body);
            const result = await cursor.toArray();
            res.send(result);
        })




        // not private root
        const comments = database.collection("comments");   // food Menu part
        // find all data from foods_menu with body filter
        app.get('/comments', async (req, res) => {
            const cursor = comments.find({});
            const result = await cursor.toArray();
            res.send(result);
        })







        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);
// home root
app.get('/', (req, res) => {
    res.send('Welcome To RK® Resturent')
})
// deploy server
app.listen(port, () => {
    console.log(`server run by : ${port}`)
})