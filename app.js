const express = require("express");
const app = express();
const path = require("path");
const bcrypt = require("bcrypt");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const jwt = require("jsonwebtoken")
const bodyParser = require("body-parser")
app.use(bodyParser.json());

const dbPath = path.join(__dirname,"userdata.db");
let db = null

const initializeDbAndServer = async () => {
    try {
        db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        })
        app.listen(3002, () => {
            console.log("server is running at http:localhost:3002")
        })
    }
    catch(e) {
        console.log(`DB: ERROR ${e.message}`);
        process.exit(1)
    }
}

app.post("/Register", async(request,response) => {
    const {username,password,mobileNumber,country,city,pinCode,role} = request.body;
    const hashedPassword = await bcrypt.hash(password,10);
    const checkUsernameAvailability = `
    SELECT name
    FROM users
    WHERE name = '${username}';
    `;
    const queryResults = await db.get(checkUsernameAvailability);
    if (queryResults === undefined) {
        const addNewUser = `
        INSERT INTO users(name,password,mobile_number,country,city,pincode,role)
        values (
            '${username}',
            '${hashedPassword}',
            ${mobileNumber},
            '${country}',
            '${city}',
            ${pinCode},
            '${role}');
        `;
        await db.run(addNewUser)
        response.send("New User Added")

    }
    else {
        response.status(400);
        response.send("user already exists");
    }
})


app.post("/login", async(request,response) => {
    const {username,password} = request.body;
    const checkUsername = `
    SELECT *
    FROM users
    WHERE name = '${username}'
    `
    const usernameAvailability = await db.get(checkUsername)
    if (usernameAvailability === undefined) {
        response.status(400);
        response.send("User Not Available in Our Records Please Register")
    }
    else {
        const comparePassword = await bcrypt.compare(password,usernameAvailability.password);
        if (comparePassword === true) {
            const payload = {
                name: username
            }
            const jwtToken = jwt.sign(payload,"my_token")
            response.send(jwtToken)
        }
        else {
            response.status(400);
            response.send("Invalid Password")
        }
    }
})

initializeDbAndServer()