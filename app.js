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
            const weekDays = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
            const dateAndTime = new Date();
            const date = dateAndTime.getDate().toString()
            const month = (dateAndTime.getMonth()+1).toString()
            const year = dateAndTime.getFullYear().toString()
            const dayNumber = dateAndTime.getDay()
            const day = weekDays[dayNumber]
            const logged_date = day + " "+date + "-" + month + "-" + year
            const user_id = usernameAvailability.id;
            const user_name = usernameAvailability.name;
            const addSessionDate = `
            INSERT INTO session_management(id,name,logged_in_at)
            VALUES (
                ${user_id},
                '${user_name}',
                '${logged_date}'
            )
            `
            await db.run(addSessionDate);
            const jwtToken = jwt.sign(payload,"my_token")
            response.send(jwtToken)
        }
        else {
            response.status(400);
            response.send("Invalid Password")
        }
    }
})

// get the user 
app.get("/data", async (request,response) => {
    const getFromTable = `
    SELECT *
    FROM users
    `
    const resultData = await db.all(getFromTable);
    response.send(resultData);
})

app.get("/sessions",async(request,response) => {
    const getTheData = `
    SELECT *
    FROM session_management
    `
    const get = await db.all(getTheData)
    response.send(get)
})

// FETCHING THE DATA BY USING OPEN WEATHER API  
app.post("/weatherDetails",async(request,response) => {
    const {userInput} = request.body;
    const fetchingUrl = await fetch(`https://api.openweathermap.org/data/2.5/weather?units=metric&q=${userInput}&appid=2fe74895e927cbe81e92169f1a159f12`)
    const responseData = await fetchingUrl.json()
    response.send(responseData)
})

initializeDbAndServer()