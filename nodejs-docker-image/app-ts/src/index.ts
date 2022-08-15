import express from "express";

const app = express();

app.get("/", (_, res) => res.send("hello world"));

app.listen(3000, () => console.log("server up on port 3000"));
