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
      artifact.likeCount = Number(artifact.likeCount) || 0;
      const result = await artifactCollections.insertOne(artifact);
      res.send(result);
    });

    app.get("/artifact/:id", async (req, res) => {
      const { id } = req.params;
      try {
        const artifact = await artifactCollections.findOne({
          _id: new ObjectId(id),
        });
        if (!artifact) {
          return res.status(404).json({ message: "Artifact not found" });
        }
        res.send(artifact);
      } catch (error) {
        res.status(400).json({ message: "Invalid artifact ID" });
      }
    });

    app.get("/all-artifacts", async (req, res) => {
      const artifacts = await artifactCollections.find().toArray();
      res.json(artifacts);
    });

    app.get("/my-artifacts", async (req, res) => {
      const { email } = req.query;
      if (!email) {
        return res
          .status(400)
          .json({ message: "Email query parameter is required" });
      }
      const artifacts = await artifactCollections
        .find({ userEmail: email })
        .toArray();
      res.json(artifacts);
    });

    app.get("/liked-artifacts", async (req, res) => {
      const { email } = req.query;
      if (!email) {
        return res
          .status(400)
          .json({ message: "Email query parameter is required" });
      }

      // Get all liked artifactIds for this user
      const likes = await likeCollections.find({ userEmail: email }).toArray();
      const artifactIds = likes.map((like) => new ObjectId(like.artifactId));

      // If no likes, return empty array
      if (artifactIds.length === 0) {
        return res.json([]);
      }

      // Get all artifacts with those IDs
      const artifacts = await artifactCollections
        .find({ _id: { $in: artifactIds } })
        .toArray();

      res.json(artifacts);
    });

    app.post("/artifact/like", async (req, res) => {
      const { artifactId, userEmail } = req.body;
      let artifactObjectId;
      try {
        artifactObjectId = new ObjectId(artifactId);
      } catch (err) {
        return res.status(400).json({ message: "Invalid artifactId" });
      }
      const existingLike = await likeCollections.findOne({
        artifactId,
        userEmail,
      });

      if (existingLike) {
        await likeCollections.deleteOne({ artifactId, userEmail });
        await artifactCollections.updateOne(
          { _id: artifactObjectId },
          { $inc: { likeCount: -1 } }
        );
        return res.send({ liked: false, message: "Unliked" });
      } else {
        await likeCollections.insertOne({ artifactId, userEmail });
        await artifactCollections.updateOne(
          { _id: artifactObjectId },
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
