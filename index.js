const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Mongo connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.jzcyg6t.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const artifactCollections = client.db("artifacts").collection("artifacts");
    const likeCollections = client.db("artifacts").collection("likes");

    app.post("/artifacts", async (req, res) => {
      const artifact = req.body;
      const result = await artifactCollections.insertOne(artifact);
      res.send(result);
    });

    app.post("/artifact/like", async (req, res) => {
      const { artifactId, userEmail } = req.body;

      // Check if like exists
      const existingLike = await likeCollections.findOne({
        artifactId,
        userEmail,
      });

      if (existingLike) {
        // Unlike: Remove like and decrement likeCount
        await likeCollections.deleteOne({ artifactId, userEmail });
        await artifactCollections.updateOne(
          { _id: ObjectId(artifactId) },
          { $inc: { likeCount: -1 } }
        );
        return res.send({ liked: false, message: "Unliked" });
      } else {
        // Like: Add like and increment likeCount
        await likeCollections.insertOne({ artifactId, userEmail });
        await artifactCollections.updateOne(
          { _id: ObjectId(artifactId) },
          { $inc: { likeCount: 1 } }
        );
        return res.send({ liked: true, message: "Liked" });
      }
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
