const express = require("express");
const app = express();
const path = require("path");
const bcrypt = require("bcrypt");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const jwt = require("jsonwebtoken")
const cors = require("cors")
const bodyParser = require("body-parser")
app.use(bodyParser.json());
app.use(cors());

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
// REGISTER ROUTE
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

// LOGIN ROUTE
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
            // GENERATING DATE, USER ID AND USER NAME
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

            // FETCHING IP ADDRESS 
            const url = await fetch("https://api.ipify.org/?format=json")
            const ipAddress = await url.json()
            const convertingIpAddressToString = ipAddress.ip.toString()
            const addSession = `
            INSERT INTO sessions(id,name,logged_at,ip_address)
            VALUES (
                ${user_id},
                '${user_name}',
                '${logged_date}',
                '${convertingIpAddressToString}'
            )
            `
            await db.run(addSession);
            const jwtToken = jwt.sign(payload,"my_token")
            response.send(jwtToken)
        }
        else {
            response.status(400);
            response.send("Invalid Password")
        }
    }
})

// CREATE EVENT ROUTE
app.post("/events", async(request,response) => {
    const {name,date,location,description} = request.body;
    const checkNameIsAvailableOrNot = `
    SELECT *
    FROM events
    `
    const nameAvailability = await db.get(checkNameIsAvailableOrNot)
    if (nameAvailability === undefined) {
        const addNewEventUser = `
        INSERT INTO events(name,date,location,description)
        values (
            '${name}',
            '${date}',
            '${location}',
            '${description}'
        )
        `
        await db.run(addNewEventUser)
        response.send("New user added to the events table")
    }
    else {
        response.status(400);
        response.send("Username already exists")
    }
})

// RETRIEVE ALL THE EVENTS ROUTE
app.get("/events",async(request,response) => {
    const retrieveAllTheEvents = `
    SELECT *
    FROM events
    `
    const resultOfTheAboveQuery = await db.all(retrieveAllTheEvents)
    response.send(resultOfTheAboveQuery) 
})

// UPDATE EVENT ROUTE
app.put("/events/:id",async(request,response) => {
    const {id} = request.params
    const {name,date,location,description} = request.body
    const checkIdIsPresentInEventTable = `
    SELECT *
    FROM events
    WHERE id = ${id}
    `
    const checkId = await db.get(checkIdIsPresentInEventTable)
    if (checkId === undefined) {
        response.status(400);
        response.send("Event id does not exist")
    }
    else {
        const updateEvent = `
        UPDATE 
            events
        SET 
            name = '${name}',
            date = '${date}',
            location = '${location}',
            description = '${description}'
        WHERE 
            id = ${id}
        `
        await db.run(updateEvent)
        response.send("Event updated Successfully")
    }
})

// DELETE EVENT ROUTE
app.delete("/events/:id", async(request,response) => {
    const {id} = request.params;
    const checkIdIsPresentInEventTable = `
    SELECT *
    FROM events
    WHERE id = ${id}
    `
    const checkId = await db.get(checkIdIsPresentInEventTable)
    if (checkId === undefined) {
        response.status(400);
        response.send("Event id does not exist")
    }
    else {
        const deleteEvent = `DELETE FROM events WHERE id = ${id}`
        await db.run(deleteEvent);
        response.send("Event deleted successfully");
    }
})


// FETCHING SESSIONS ROUTE
app.get("/sessions",async(request,response) => {
    const query = `
        SELECT *
        FROM sessions
    `
    const runQuery = await db.all(query)
    response.send(runQuery)
})

// FETCHING THE DATA BY USING OPEN WEATHER API  ROUTE
app.get("/weatherDetails/:location",async(request,response) => {
    const {location} = request.params;
    const fetchingUrl = await fetch(`https://api.openweathermap.org/data/2.5/weather?units=metric&q=${location}&appid=2fe74895e927cbe81e92169f1a159f12`)
    const responseData = await fetchingUrl.json()
    response.send(responseData)
})


initializeDbAndServer()