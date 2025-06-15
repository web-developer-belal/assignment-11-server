const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const port = process.env.PORT || 3000;

// Middleware
app.use(
  cors({
    origin: ["http://localhost:5174", "https://react-auth-35410.web.app"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Mongo connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.jzcyg6t.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: false,
    deprecationErrors: true,
  },
});

const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: "Unauthorized: No token" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err || !decoded) {
      console.error("JWT verification error:", err);
      return res.status(401).send({ message: "Unauthorized or token expired" });
    }

    req.decoded = decoded;
    next();
  });
};

const matchEmail = (req, res, next) => {
  const tokenEmail = req?.decoded?.email;
  const email = req.body?.email || req.query?.email || req.params?.email;

  if (!tokenEmail) {
    return res
      .status(401)
      .send({ message: "Unauthorized: Missing token email" });
  }

  if (!email) {
    return res.status(400).send({ message: "Missing email in request" });
  }

  if (tokenEmail !== email) {
    return res.status(403).send({ message: "Forbidden: Email mismatch" });
  }

  next();
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const artifactCollections = client.db("artifacts").collection("artifacts");
    const likeCollections = client.db("artifacts").collection("likes");

    // Create text index if not exists
    // await artifactCollections.createIndex({ artifactName: "text" });
    app.post("/jwt-token", async (req, res) => {
      const { email } = req.body;
      const user = { email };
      const token = jwt.sign(user, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
          path: '/',
        })
        .send({ success: true })
    });

    app.post("/artifacts", verifyToken, async (req, res) => {
      const artifact = req.body;
      artifact.likeCount = Number(artifact.likeCount) || 0;
      const result = await artifactCollections.insertOne(artifact);
      res.send(result);
    });

    app.get("/artifact/:id", verifyToken, async (req, res) => {
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
      const { search, limit } = req.query;
      let filter = {};
      let sort = { likeCount: -1 };
      let projection = {};

      if (search && search.length > 0) {
        // Use $text if you want full-text search (for whole words)
        // Otherwise, use regex for partial matches
        if (search.length > 2) {
          filter = { $text: { $search: search } };
          projection = { score: { $meta: "textScore" } };
          sort = { score: { $meta: "textScore" }, likeCount: -1 };
        } else {
          filter = {
            $or: [{ artifactName: { $regex: search, $options: "i" } }],
          };
          // Do NOT include score in projection or sort for regex
          projection = {};
          sort = { likeCount: -1 };
        }
      }

      let cursor = artifactCollections
        .find(filter)
        .project(projection)
        .sort(sort);

      if (limit) {
        cursor = cursor.limit(Number(limit));
      }

      const artifacts = await cursor.toArray();
      res.send(artifacts);
    });

    app.get("/my-artifacts", verifyToken, matchEmail, async (req, res) => {
      const { email, search, limit } = req.query;
      if (!email) {
        return res
          .status(400)
          .json({ message: "Email query parameter is required" });
      }

      let filter = { userEmail: email };
      let sort = { likeCount: -1 };
      let projection = {};

      if (search && search.length > 0) {
        if (search.length > 2) {
          filter.$text = { $search: search };
          projection = { score: { $meta: "textScore" } };
          sort = { score: { $meta: "textScore" }, likeCount: -1 };
        } else {
          filter.$or = [{ artifactName: { $regex: search, $options: "i" } }];
          projection = {};
          sort = { likeCount: -1 };
        }
      }

      let cursor = artifactCollections
        .find(filter)
        .project(projection)
        .sort(sort);

      if (limit) {
        cursor = cursor.limit(Number(limit));
      }

      const artifacts = await cursor.toArray();
      res.send(artifacts);
    });

    app.get("/liked-artifacts", verifyToken, matchEmail, async (req, res) => {
      const { email, search, limit } = req.query;
      if (!email) {
        return res
          .status(400)
          .json({ message: "Email query parameter is required" });
      }

      const likes = await likeCollections.find({ userEmail: email }).toArray();
      const artifactIds = likes.map((like) => new ObjectId(like.artifactId));
      if (artifactIds.length === 0) return res.json([]);

      let filter = { _id: { $in: artifactIds } };
      let sort = { likeCount: -1 };
      let projection = {};

      if (search && search.length > 0) {
        if (search.length > 2) {
          filter.$text = { $search: search };
          projection = { score: { $meta: "textScore" } };
          sort = { score: { $meta: "textScore" }, likeCount: -1 };
        } else {
          filter.$or = [{ artifactName: { $regex: search, $options: "i" } }];
          projection = {};
          sort = { likeCount: -1 };
        }
      }

      let cursor = artifactCollections
        .find(filter)
        .project(projection)
        .sort(sort);

      if (limit) {
        cursor = cursor.limit(Number(limit));
      }

      const artifacts = await cursor.toArray();
      res.json(artifacts);
    });

    app.post("/artifact/like", verifyToken, async (req, res) => {
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

    app.put("/artifact/:id", verifyToken, matchEmail, async (req, res) => {
      const { id } = req.params;
      const updateData = req.body;
      try {
        const result = await artifactCollections.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateData }
        );
        if (result.matchedCount === 0) {
          return res.status(404).json({ message: "Artifact not found" });
        }
        res.json({ message: "Artifact updated", result });
      } catch (error) {
        res.status(400).json({ message: "Invalid artifact ID" });
      }
    });

    app.delete("/artifact/:id", verifyToken, matchEmail, async (req, res) => {
      const { id } = req.params;
      try {
        const result = await artifactCollections.deleteOne({
          _id: new ObjectId(id),
        });
        if (result.deletedCount === 0) {
          return res.status(404).json({ message: "Artifact not found" });
        }
        res.json({ message: "Artifact deleted" });
      } catch (error) {
        res.status(400).json({ message: "Invalid artifact ID" });
      }
    });

    app.post("/logout", (req, res) => {
      res.clearCookie('token', {
          secure: process.env.NODE_ENV === 'production', // HTTPS in production
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict', // Cross-site in production
          httpOnly: true,
          path: '/', // Match the path where the cookie was set
        })

        res.status(200).send({ success: true })
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
