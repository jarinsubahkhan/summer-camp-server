const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config()
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster01.fjx0jhm.mongodb.net/?retryWrites=true&w=majority`;

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

const classesCollection = client.db("schoolDb").collection("classes");
const selectedCollection = client.db("schoolDb").collection("selected");

app.get('/classes', async(req, res) => {
    const result = await classesCollection.find().toArray();
    res.send(result);
})

app.get('/selected', async(req, res) => {
    const email = req.query.email;
    if(!email){
        res.send([]);
    }
    const query = { email: email };
    const result = await selectedCollection.find(query).toArray();
    res.send(result);
});

app.post('/selected', async(req, res) => {
    const select = req.body;
    const result = await selectedCollection.insertOne(select);
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


app.get('/', (req, res) => {
    res.send('school camp is running')
})

app.listen(port, () => {
    console.log(`School camp is running on port ${port}`)
})