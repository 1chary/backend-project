const express = require("express");
const app = express();
const path = require("path");
const bcrypt = require("bcrypt");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

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
})


initializeDbAndServer()