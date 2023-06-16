const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion } = require("mongodb");
const app = express();
require("dotenv").config();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }
  // bearer token
  const token = authorization.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

const uri =
  `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.hxpxamt.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const instructorsCollection = client.db("summerCamp").collection("instructor");
    const classesCollection = client.db("summerCamp").collection("classes");
    const cartCollection = client.db("summerCamp").collection("carts");
    const usersCollection= client.db("summerCamp").collection("users");



 app.post("/jwt", (req, res) => {
   const user = req.body;
   const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
     expiresIn: "1h",
   });

   res.send({ token });
 });

      const verifyAdmin = async (req, res, next) => {
        const email = req.decoded.email;
        const query = { email: email };
        const user = await usersCollection.findOne(query);
        if (user?.role !== "admin") {
          return res
            .status(403)
            .send({ error: true, message: "forbidden message" });
        }
        next();
    };
    
     app.get("/users", verifyJWT, verifyAdmin, async (req, res) => {
       const result = await usersCollection.find().toArray();
       res.send(result);
     });

     app.post("/users", async (req, res) => {
       const user = req.body;
       const query = { email: user.email };
       const existingUser = await usersCollection.findOne(query);

       if (existingUser) {
         return res.send({ message: "user already exists" });
       }

       const result = await usersCollection.insertOne(user);
       res.send(result);
     });
    
    
     app.get("/users/admin/:email", verifyJWT, async (req, res) => {
       const email = req.params.email;

       if (req.decoded.email !== email) {
         res.send({ admin: false });
       }

       const query = { email: email };
       const user = await usersCollection.findOne(query);
       const result = { admin: user?.role === "admin" };
       res.send(result);
     });

     app.patch("/users/admin/:id", async (req, res) => {
       const id = req.params.id;
       console.log(id);
       const filter = { _id: new ObjectId(id) };
       const updateDoc = {
         $set: {
           role: "admin",
         },
       };

       const result = await usersCollection.updateOne(filter, updateDoc);
       res.send(result);
     });

 app.post("/create-payment-intent", verifyJWT, async (req, res) => {
   const { price } = req.body;
   const amount = parseInt(price * 100);
   const paymentIntent = await stripe.paymentIntents.create({
     amount: amount,
     currency: "usd",
     payment_method_types: ["card"],
   });

   res.send({
     clientSecret: paymentIntent.client_secret,
   });
 });

 // payment related api
 app.post("/payments", verifyJWT, async (req, res) => {
   const payment = req.body;
   const insertResult = await paymentCollection.insertOne(payment);

   const query = {
     _id: { $in: payment.cartItems.map((id) => new ObjectId(id)) },
   };
   const deleteResult = await cartCollection.deleteMany(query);

   res.send({ insertResult, deleteResult });
 });

 app.get("/admin-stats", verifyJWT, verifyAdmin, async (req, res) => {
   const users = await usersCollection.estimatedDocumentCount();
   const products = await menuCollection.estimatedDocumentCount();
   const orders = await paymentCollection.estimatedDocumentCount();



   const payments = await paymentCollection.find().toArray();
   const revenue = payments.reduce((sum, payment) => sum + payment.price, 0);

   res.send({
     revenue,
     users,
     products,
     orders,
   });
 });

    

app.get("/instructor", async (req, res) => {
  const result = await instructorsCollection.find().toArray();
  res.json(result);
});


app.get("/classes", async (req, res) => {
  try {
    const classes = await classesCollection
      .find({ availableSeats: { $gt: 0 } })
      .toArray();
    res.json(classes);
  } catch (error) {
    console.error("Failed to fetch classes", error);
    res.status(500).json({ error: "Failed to fetch classes" });
  }
});
    
    

   app.post("/carts", async (req, res) => {
     const item = req.body;
     const result = await cartCollection.insertOne(item);
     res.send(result);
   });


app.get("/", (req, res) => {
  res.send("Server is running");
});

app.listen(port, () => {
  console.log(`Server is running on PORT: ${port}`);
});

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

