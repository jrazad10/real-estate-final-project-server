const express = require('express')
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId, Timestamp } = require('mongodb');
require('dotenv').config()
const app = express();
const cookieParser = require('cookie-parser')
const jwt = require('jsonwebtoken')

const port = process.env.PORT || 5000;

//middleware
const corsOptions = {
    origin: ['http://localhost:5000', "http://localhost:5173"],
    credentials: true,
    optionSuccessStatus: 200
}
app.use(cors(corsOptions));
app.use(express.json())

const verifyToken = async (req, res, next) => {
    const token = req.cookies?.token
    console.log(token)
    if (!token) {
        return res.status(401).send({ message: 'unauthorized access' })
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            console.log(err)
            return res.status(401).send({ message: 'unauthorized access' })
        }
        req.user = decoded
        next()
    })
}



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fdffxhb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
        // await client.connect();

        const advertisementCollection = client.db("realEstateDB").collection("advertisement")
        const allPropertiesCollection = client.db("realEstateDB").collection("allProperties")
        const reviewsCollection = client.db("realEstateDB").collection("reviews")
        const usersCollection = client.db("realEstateDB").collection("users")

        // auth related api
        app.post('/jwt', async (req, res) => {
            const user = req.body
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '365d',
            })
            res
                .cookie('token', token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
                })
                .send({ success: true })
        })
        // Logout
        app.get('/logout', async (req, res) => {
            try {
                res
                    .clearCookie('token', {
                        maxAge: 0,
                        secure: process.env.NODE_ENV === 'production',
                        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
                    })
                    .send({ success: true })
                console.log('Logout successful')
            } catch (err) {
                res.status(500).send(err)
            }
        })

        //save a user in db
        app.put('/user', async (req, res) => {
            const user = req.body
            const options = { upsert: true }
            const query = { email: user?.email }
            const updateDoc = {
                $set: {
                    ...user,
                    Timestamp: Date.now(),
                },
            }
            const result = await usersCollection.updateOne(query, updateDoc, options)
            res.send(result)
        })

        //all advertisement form db
        app.get('/advertisement', async (req, res) => {
            const result = await advertisementCollection.find().toArray();
            res.send(result)
        })

        app.get('/advertisement/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await advertisementCollection.findOne(query)
            res.send(result)
        })

        //all properties form db
        app.get('/allProperties', async (req, res) => {
            const result = await allPropertiesCollection.find().toArray();
            res.send(result)
        })

        app.get('/allProperties/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await allPropertiesCollection.findOne(query)
            res.send(result)
        })

        //save a property data
        app.post('/property', async (req, res) => {
            const propertyData = req.body
            const result = await allPropertiesCollection.insertOne(propertyData)
            res.send(result)
        })

        //get all property for agent
        app.get('/my-added-properties/:email', async (req, res) => {
            const email = req.params.email
            let query = { 'agent.email': email }
            const result = await allPropertiesCollection.find(query).toArray();
            res.send(result)
        })

        //delete a property
        app.delete('/my-added-properties/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await allPropertiesCollection.deleteOne(query)
            res.send(result)
        })

        //all reviews form db
        app.get('/reviews', async (req, res) => {
            const result = await reviewsCollection.find().toArray();
            res.send(result)
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






app.get('/', (req, res) => {
    res.send('RealEstate is running')
})

app.listen(port, () => {
    console.log(`RealEstate is running on port ${port}`);
})