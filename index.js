// install applicition
const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
// const mongoose = require('mongoose');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const cors = require('cors');
require('dotenv').config()

// set app
const app = express();

// use middleware in app
app.use(express.json());
app.use(morgan('dev'));
app.use(cookieParser());
app.use(cors({
    origin: [
        "http://localhost:5173",
        "http://localhost:5174",
        "https://rk-resturent.web.app",
        "https://rk-resturent.firebaseapp.com",
    ],
    credentials: true,
}));
// methods: ['GET', 'POST', 'PUT', 'DELETE'],


// custome middleware
const verifyJWT = (req, res, next) => {
    const token = req.cookies.RK_User_Token; // assuming Bearer token
    // if token was not exist
    if (!token) {
        return res.status(401).send({ message: 'Invalid User' });
    }
    // decode the token
    jwt.verify(token, process.env.JWT_Secret_Key, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'Invalid User' });
        }
        else {
            req.user = decoded; // Attach user data to request object
            next(); // Proceed to next middleware or route handler
        }
    });
};


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

const cookeOption = {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "none" : 'strict',
    secure: process.env.NODE_ENV === "production" ? true : false,
}

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();
        // Get the database and collection on which to run the operation
        const database = client.db("Rk_Resturent");

        // secret key
        const secretKey = process.env.JWT_Secret_Key;
        const comments = database.collection("comments");   // Comments part
        const contact = database.collection('contactUser');  // contactUser data
        const food_menu = database.collection("foods_menu");  // food Menu part
        const cardList = database.collection("user_card_list"); // card list part
        const userData = database.collection("users");   // User login part


        // addmin verify Token
        const isAdmin = async (req, res, next) => {
            const data = req.body;
            const obj = req.user;
            // next()
            if (data.email === obj.email) {
                const result = await userData.findOne({ email: data.email });
                if (result.role === 'admin') {
                    next();
                }
                else {
                    return res.status(401).send({ message: 'Invalid User' })
                }
            }
            else {
                return res.status(401).send({ message: 'Invalid User' })
            }
        }

        app.post('/create_jwt', async (req, res) => {   // create verify jwt token
            // user email from firebase
            const email = req.body;
            // check is user is valid
            const result = await userData.findOne(email);
            if (result._id) {
                const token = jwt.sign(email, secretKey, { expiresIn: '1h' });
                res
                    .cookie('RK_User_Token', token, cookeOption)
                    .send({ token: 'successful' })
            }
            else {
                return res.status(401).send({ message: 'Invalid User' })
            }
        })
        // delete the cookie from cookies area
        // app.post('/logoutJwt', (req, res) => {
        //     res.clearCookie('RK_User_Token', {
        //         httpOnly: true,
        //         path: '/',
        //         domain: 'localhost',
        //      // maxAge: 0
        //     });
        //     res.send('hi');
        // })
        app.post('/logoutJwt', (req, res) => {
            res.clearCookie('RK_User_Token', { ...cookeOption, maxAge: 0 });
            res.send('hi');
        })


        // not private root
        // find all data from foods_menu with body filter
        // TODO : only set for admin
        app.get('/food_menu', verifyJWT, isAdmin, async (req, res) => {  //only admin can access this data
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
        // find first 6 data from foods_menu with body filter
        app.post('/food_menu/:num', async (req, res) => {
            const obj = req.user;
            const body = req.body;
            const num = parseInt(req.params.num);
            const cursor = food_menu.find(body).limit(num);
            const result = await cursor.toArray();
            res.send(result);
        })
        // find a data with _id
        app.get('/food_targeted/:id', verifyJWT, async (req, res) => {
            const currentId = req.params.id;
            const query = { "_id": currentId };
            const options = {
                projection: { image: 1, name: 1, price: 1 },
            };
            const cursor = await food_menu.findOne(query, options);
            res.send(cursor)
        })


        // not private root
        // find all data from comments with body filter
        app.get('/comments', async (req, res) => {
            const cursor = comments.find({});
            const result = await cursor.toArray();
            res.send(result);
        })

        // not private root
        // find all data from users with body filter
        app.post('/users', verifyJWT, isAdmin, async (req, res) => {  //only admin can access this data
            const cursor = userData.find({});
            const result = await cursor.toArray();
            res.send(result);
        })
        app.post('/user', async (req, res) => {  //create new user
            const body = req.body;
            const result = await userData.insertOne(body);
            res.send({ status: 'successfull' });
        })
        // add a admin id
        app.post('/add_admin/:id', verifyJWT, isAdmin, async (req, res) => {   // create a new admin 
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: 'admin',
                },
            };
            const options = { upsert: true };
            const result = await userData.updateOne(filter, updateDoc, options);
            res.send({ user: "updated" });
        })
        // this api for dashboard
        app.post('/users/email', verifyJWT, async (req, res) => { // server path == /users/email?
            // token data
            const obj = req.user;
            const token_email = obj.email;
            // user query path data
            const query = req.query;
            const user_email = query.email;
            if (token_email === user_email) {
                // user info
                const options = {
                    projection: { _id: 0, password: 0, },
                };
                const user = await userData.findOne({ email: user_email }, options);
                // card info
                const options2 = {
                    projection: { _id: 0, userEmail: 0 },
                };
                const userCard = await cardList.find({ userEmail: user_email }, options2).toArray();
                res.send([
                    { message: 'Valid User' },
                    user,   // user info
                    userCard,
                ]);
            }
            else {
                res.status(401).send({ message: 'Invalid User' })
            }
        })



        // read all data for user card list
        // TODO : only set for admin
        app.get('/users_card_list', verifyJWT, isAdmin, async (req, res) => {  //only admin can access this data
            const cursor = cardList.find({});
            const result = await cursor.toArray();
            res.send(result);
        })
        // post a data in user card list
        app.post('/user_card_add', verifyJWT, async (req, res) => {
            const body = req.body;
            const result = await cardList.insertOne(body);
            res.send({ status: true });
        })


        // private data
        // TODO : only set for admin
        app.get('/contactUsers', verifyJWT, isAdmin, async (req, res) => {   //only admin can access this data
            const cursor = contact.find({});
            const result = await cursor.toArray();
            res.send(result);
        })
        app.post('/contactUser', verifyJWT, async (req, res) => {
            const body = req.body;
            const result = await contact.insertOne(body);
            res.send({ status: 'successfull' });
        })


        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
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