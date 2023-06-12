const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();
require('dotenv').config();
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY);
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if(!authorization){
        return res.status(401).send({error: true, message: 'unauthorized access'});
    }
    const token = authorization.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if(err){
            return res.status(401).send({error: true, message: 'unauthorized access'})
        }
        req.decoded = decoded;
        next();
    })
} 


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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

const usersCollection = client.db("schoolDb").collection("users");
const classesCollection = client.db("schoolDb").collection("classes");
const selectedCollection = client.db("schoolDb").collection("selected");
const paymentCollection = client.db("schoolDb").collection("payment");


app.post('/jwt', (req, res) => {
    const user = req.body;
    const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '8h' })
    res.send({ token })
})



const verifyAdmin = async (req, res, next) => {
const email = req.decoded.email;
const query = { email: email }
const user = await usersCollection.findOne(query);
if(user?.role !== 'admin') {
    return res.status(403).send({error:true, message: 'forbidden message' });

}
next();
}



const verifyInstructor = async (req, res, next) => {
const email = req.decoded.email;
const query = { email: email }
const user = await usersCollection.findOne(query);
if(user?.role !== 'instructor') {
    return res.status(403).send({error:true, message: 'forbidden message' });

}
next();
}



app.get('/users',verifyJWT,verifyAdmin, async (req, res) => {
    const result = await usersCollection.find().toArray();
    res.send(result);
})

app.post('/users', async(req,res) => {
    const user = req.body;
    const query = {email: user.email}
    const existingUser = await usersCollection.findOne(query);
    if(existingUser){
        return res.send({ message: 'user already exists'})
    }
    const result = await usersCollection.insertOne(user);
    res.send(result);
});

app.get('/users/admin/:email', verifyJWT, async (req, res) => {
    const email = req.params.email;

    if(req.decoded.email !== email) {
       return res.send({ admin: false })
    }
    const query = { email: email }
    const user = await usersCollection.findOne(query);
    const result = { admin: user?.role === 'admin' }
   return res.send(result);
})

app.get('/users/instructor/:email', verifyJWT, async (req, res) => {
    const email = req.params.email;

    if(req.decoded.email !== email) {
      return  res.send({ instructor: false })
    }
    const query = { email: email }
    const user = await usersCollection.findOne(query);
    const result = { instructor: user?.role === 'instructor' }
   return res.send(result);
})

app.patch('/users/admin/:id', async (req, res) => {
    const id = req.params.id;
    const filter = {_id: new ObjectId(id) };
    const updateDoc = {
        $set: {
role: 'admin'
        },
    };
    const result = await usersCollection.updateOne(filter, updateDoc);
    res.send(result);
}); 

app.patch('/users/instructor/:id', async (req, res) => {
    const id = req.params.id;
    const filter = {_id: new ObjectId(id) };
    const updateDoc = {
        $set: {
role: 'instructor'
        },
    };
    const result = await usersCollection.updateOne(filter, updateDoc);
    res.send(result);
});


app.get('/classes', async(req, res) => {
    const result = await classesCollection.find().toArray();
    res.send(result);
})

app.post('/classes', async(req, res) => {
    const classItem = req.body;
    const result = await classesCollection.insertOne(classItem)
    res.send(result);
})

app.get('/selected', async(req, res) => {
    const email = req.query.email;
    if(!email){
        res.send([]);
    }

const decodedEmail = req.decoded.email;
if(email !== decodedEmail){
    return res.status(403).send({error: true, message: 'forbidden access'})
}

    const query = { email: email };
    const result = await selectedCollection.find(query).toArray();
    res.send(result);
});

app.post('/selected', async(req, res) => {
    const select = req.body;
    const result = await selectedCollection.insertOne(select);
    res.send(result);

});

app.delete('/selected/:id', async(req,res) => {
    const id = req.params.id;
    const query = {_id: new ObjectId(id)};
    const result = await selectedCollection.deleteOne(query);
    res.send(result);
});

app.post('/create-payment-intent', async(req, res) => {
    const {price} = req.body;
   
    const amount = (price * 100);
    const paymentIntent = await stripe.paymentIntents.create({
        currency: 'usd',
        amount: amount,
        "payment_method_types": ['card'] 
    });
    res.send({
        clientSecret: paymentIntent.client_secret 
    })
})

app.post('/payment',verifyJWT, async(req, res) => {
const payment = req.body;
const insertResult = await paymentCollection.insertOne(payment)

const query = {_id: {$in: payment.selectedClass.map(id => new ObjectId(id))}}
const deleteResult = await selectedCollection.deleteMany(query)
res.send({insertResult, deleteResult})
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