require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const fileUpload = require("express-fileupload");
const crypto = require("crypto");
var FormData = require("form-data");
const axios = require("axios");

// defining the Express app
const app = express();

// defining an array to work as the database (temporary solution)
const message = {
  message: "Hello world! Welcome to HEIDI!",
};

// adding Helmet to enhance your Rest API's security
app.use(helmet());

// using bodyParser to parse JSON bodies into JS objects
app.use(bodyParser.json());

// enabling CORS for all requests
app.use(cors());

// adding morgan to log HTTP requests
app.use(morgan("combined"));

app.use(
  fileUpload({
    limits: {
      fileSize: 10000000,
    },
    abortOnLimit: true,
  })
);

app.get("/", (req, res) => {
  res.send(message);
});

app.post("/upload", async (req, res) => {
  function signWithHmacSha1(key, data) {
    const hmac = crypto.createHmac("sha1", key);
    hmac.update(data);
    return hmac.digest("base64");
  }

  function base64EncodeUtf8(policy) {
    const utf8String = encodeURIComponent(policy).replace(
      /%([0-9A-F]{2})/g,
      (match, p1) => String.fromCharCode(`0x${p1}`)
    );
    const base64String = Buffer.from(utf8String, "utf8").toString("base64");
    return base64String;
  }

  function base64DecodeUtf8(base64String) {
    const utf8String = Buffer.from(base64String, "base64").toString("utf8");
    const decodedString = decodeURIComponent(
      utf8String.replace(/%([0-9A-F]{2})/g, (match, p1) => `%${p1}`)
    );
    return decodedString;
  }
  const requestTime = new Date().toUTCString();
  const canonicalizedResource = "/imageuploadtest/object01";
  const canonicalizedHeaders = "";
  const contentMD5 = "";
  const contentType = "";

  // let policy = {
  //   expiration: new Date(Date.now() + 1000 * 60).toUTCString(),
  //   conditions: [
  //     { "x-obs-acl": "public-read" },
  //     { bucket: "imageuploadtest" },
  //     { key: "object01" },
  //     {}
  //   ],
  // };

  let policy = {
    expiration: new Date(Date.now() + 1000 * 60).toUTCString(),

    conditions: [
      { bucket: "imageuploadtest" },

      ["eq", "$key", "object01"],

      { "x-obs-acl": "public-read" },

      ["eq", "$Content-Type", "image/jpeg"],
      ["content-length-range", 1, 104857600],
    ],
  };

  const { image } = req.files;

  // Calculate the signature based on the request.
  // const canonicalString = `POST\n${contentMD5}\n${contentType}\n${requestTime}\n${canonicalizedHeaders}${canonicalizedResource}`;
  const canonicalString = base64EncodeUtf8(JSON.stringify(policy));
  // const decodedObject = base64DecodeUtf8(
  //   "ewogICJleHBpcmF0aW9uIjogIjIwMTktMDctMDFUMTI6MDA6MDAuMDAwWiIsCiAgImNvbmRpdGlvbnMiOiBbCiAgICB7ImJ1Y2tldCI6ICJleGFtcGxlYnVja2V0IiB9LAogICAgWyJlcSIsICIka2V5IiwgInRlc3RmaWxlLnR4dCJdLAoJeyJ4LW9icy1hY2wiOiAicHVibGljLXJlYWQiIH0sCiAgICBbImVxIiwgIiRDb250ZW50LVR5cGUiLCAidGV4dC9wbGFpbiJdLAogICAgWyJjb250ZW50LWxlbmd0aC1yYW5nZSIsIDYsIDEwXQogIF0KfQo="
  // );
  console.log(`StringToSign: [${canonicalString}]`);
  // console.log("Decodec", decodedObject);
  const signature = signWithHmacSha1(process.env.SECRET_KEY, canonicalString);

  const url = process.env.BUCKET_HOST; // http://imageuploadtest.obs.eu-de.otc.t-systems.com/

  const formData = new FormData();
  formData.append("key", "object01");
  formData.append("acl", "public-read");
  formData.append("content-type", "image/jpeg");
  formData.append("expires", new Date().toDateString());
  formData.append("AccessKeyId", process.env.ACCESS_KEY);
  formData.append("policy", canonicalString);
  formData.append("signature", signature);
  formData.append("file", image.data, {
    filename: `${requestTime}.jpg`,
    contentType: "image/jpeg",
  });
  formData.append("submit", "Upload");

  const headers = {
    host: url,
    Date: requestTime,
    "Content-Type": `multipart/form-data; boundary=${formData._boundary}`,
  };

  try {
    const response = await axios.post(url, formData, { headers });
    console.log("Response Message:");
    console.log(response.status);
    console.log(response.statusText);
    console.log(response.headers);
    console.log(response.data);
    res.status(200).json({
      status: "success",
    });
  } catch (error) {
    console.error(error.message);
    res.status(200).json({
      status: "Fail",
      error: error.message,
    });
  }
});

// starting the server
app.listen(process.env.PORT, () => {
  console.log(`listening on port ${process.env.PORT}`);
});

process.on("uncaughtException", function (err) {
  console.error(
    `${new Date().toUTCString()}: UncaughtException: ${err.message}\n${
      err.stack
    }`
  );
  process.exit(1);
});
